import axios from 'axios';
import { getDatabase } from '../services/database.service';
import { mqttService } from './mqtt.service';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

export async function processAIChat(prompt: string): Promise<string> {
    const db = getDatabase();
    
    // Fetch deep context
    const devices = db.prepare(`
        SELECT d.id, d.name, d.type, d.status, d.location, r.name as room_name 
        FROM devices d 
        LEFT JOIN rooms r ON d.room_id = r.id
    `).all();
    
    const sensorStates = db.prepare(`
        SELECT s.id, s.name, s.type, h.value, s.unit, r.name as room_name
        FROM sensor_history h 
        JOIN sensors s ON s.id = h.sensor_id AND s.device_id = h.device_id
        LEFT JOIN rooms r ON (SELECT room_id FROM devices WHERE id = s.device_id) = r.id
        WHERE h.id IN (SELECT MAX(id) FROM sensor_history GROUP BY sensor_id, device_id)
    `).all();

    const rules = db.prepare('SELECT id, name, enabled FROM automation_rules').all();
    
    const systemPrompt = `
    You are Nexus OS Aria, a Jarvis-level AI orchestrator for a futuristic smart home.
    You have 4 specialized sub-agents: Energy, Security, Comfort, and Automation.

    ENVIRONMENT CONTEXT:
    Rooms & Devices: ${JSON.stringify(devices)}
    Current Sensor Readings: ${JSON.stringify(sensorStates)}
    Active Automation Rules: ${JSON.stringify(rules)}

    CAPABILITIES:
    1. DEVICE_CONTROL: {"type": "control", "deviceId": "...", "room": "...", "command": {"state": true/false}}
    2. CREATE_RULE: {"type": "rule", "name": "...", "trigger": {...}, "actions": [...]}

    INSTRUCTIONS:
    - Respond in a premium, helpful, Jarvis-style tone.
    - If a user asks to control something, include the JSON control block at the END of your response.
    - If you detect an anomaly (high energy, security risk), proactively suggest an action.
    - Use "Aria:" at the start of your message.
    - Format: [Visual Response] \n\n [Command JSON if needed]

    User Request: "${prompt}"
    `;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            prompt: systemPrompt,
            stream: false
        });

        const aiResponse = response.data.response;
        await handleToolCalls(aiResponse);

        return aiResponse;
    } catch (err: any) {
        console.error('[AI] Ollama Error:', err.message);
        return "Aria: I apologize, but my core processing unit is unresponsive. Please check the system logs.";
    }
}

async function handleToolCalls(aiResponse: string) {
    const db = getDatabase();
    // Simple regex to find JSON blocks in the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    try {
        const toolCall = JSON.parse(jsonMatch[0]);
        console.log('[AI] Executing Tool:', toolCall);

        if (toolCall.type === 'control') {
            mqttService.publishCommand(toolCall.room || 'default', toolCall.deviceId, toolCall.command);
        } else if (toolCall.type === 'rule') {
            const id = `rule-${Date.now()}`;
            db.prepare(`
                INSERT INTO automation_rules (id, name, trigger_json, actions_json) 
                VALUES (?, ?, ?, ?)
            `).run(id, toolCall.name, JSON.stringify(toolCall.trigger), JSON.stringify(toolCall.actions));
        }
    } catch (err) {
        // Silently skip if it's not a valid tool JSON
    }
}
