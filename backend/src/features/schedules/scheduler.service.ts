import cron from 'node-cron';
import { getDatabase } from '../../services/database.service';
import { mqttService } from '../../services/mqtt.service';
import { wsService } from '../../services/websocket.service';

interface ScheduleRow {
    id: number; name: string; device_id: string; relay_id: string;
    action: string; cron_expression: string; enabled: number;
}

const activeTasks: Map<number, ReturnType<typeof cron.schedule>> = new Map();

export function initScheduler(): void {
    console.log('[Scheduler] Initializing...');
    loadSchedules();
}

export function loadSchedules(): void {
    // Stop all existing tasks
    activeTasks.forEach(task => task.stop());
    activeTasks.clear();

    const db = getDatabase();
    const schedules = db.prepare('SELECT * FROM schedules WHERE enabled = 1').all() as ScheduleRow[];

    for (const schedule of schedules) {
        scheduleTask(schedule);
    }

    console.log(`[Scheduler] Loaded ${schedules.length} active schedules`);
}

function scheduleTask(schedule: ScheduleRow): void {
    if (!cron.validate(schedule.cron_expression)) {
        console.warn(`[Scheduler] Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expression}`);
        return;
    }

    const task = cron.schedule(schedule.cron_expression, () => {
        executeSchedule(schedule);
    });

    activeTasks.set(schedule.id, task);
}

function executeSchedule(schedule: ScheduleRow): void {
    console.log(`[Scheduler] Executing: ${schedule.name} (device: ${schedule.device_id}, relay: ${schedule.relay_id}, action: ${schedule.action})`);

    const db = getDatabase();
    let newState: boolean;

    if (schedule.action === 'toggle') {
        const relay = db.prepare('SELECT state FROM relays WHERE id = ? AND device_id = ?').get(schedule.relay_id, schedule.device_id) as { state: number } | undefined;
        newState = relay ? !relay.state : true;
    } else {
        newState = schedule.action === 'on';
    }

    // Update DB
    db.prepare('UPDATE relays SET state = ? WHERE id = ? AND device_id = ?').run(newState ? 1 : 0, schedule.relay_id, schedule.device_id);
    db.prepare('UPDATE schedules SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(schedule.id);

    // Publish MQTT
    mqttService.publishRelayCommand(schedule.device_id, schedule.relay_id, newState);

    // Broadcast via WebSocket
    wsService.broadcast('relay_state', {
        deviceId: schedule.device_id,
        relayId: schedule.relay_id,
        state: newState,
        triggeredBy: 'schedule',
        scheduleName: schedule.name,
    });
}

export function reloadSchedules(): void {
    loadSchedules();
}
