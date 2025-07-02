// 🔊 Audio Handlers - معالجات الصوت
import { ipcMain } from 'electron'
import { audioService } from '../audio/audioService';

export function setupAudioHandlers() {
  // 🔊 Audio Service IPC Handlers
  ipcMain.handle('audio:play-announcement', async (_event, ticketNumber: string, windowLabel: string) => {
    try {
      console.log(`[IPC-AUDIO] Playing announcement for ticket ${ticketNumber} to ${windowLabel}`);
      const success = await audioService.playTicketAnnouncement(ticketNumber, windowLabel);
      return { success, message: success ? 'Audio played successfully' : 'Audio playback failed' };
    } catch (error) {
      console.error('[IPC-AUDIO] Error playing announcement:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:test', async () => {
    try {
      console.log('[IPC-AUDIO] Testing audio system...');
      const success = await audioService.testAudio();
      return { success, message: success ? 'Audio test completed' : 'Audio test failed' };
    } catch (error) {
      console.error('[IPC-AUDIO] Error testing audio:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:set-enabled', async (_event, enabled: boolean) => {
    try {
      audioService.setEnabled(enabled);
      console.log(`[IPC-AUDIO] Audio ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true, enabled: audioService.isAudioEnabled() };
    } catch (error) {
      console.error('[IPC-AUDIO] Error setting audio state:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:is-enabled', async () => {
    try {
      const enabled = audioService.isAudioEnabled();
      return { success: true, enabled };
    } catch (error) {
      console.error('[IPC-AUDIO] Error checking audio state:', error);
      return { success: false, enabled: false };
    }
  });

  console.log('[HANDLERS] 🔊 Audio handlers registered successfully');
}
