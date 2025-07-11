import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useServerConnection } from '../../hooks';
import { useDisplayPrinterRegistration } from '../../hooks/useDisplayPrinterRegistration';
import { useAdminServices } from '../../hooks/useAdminServices';
import { ConnectionGuard } from '../../components/ConnectionGuard';
import Logo from '../../components/Logo';

// Interface for ticket data
interface Ticket {
  id: number;
  ticket_number: string;
  service_id: number;
  service_name: string;
  status: 'pending' | 'called' | 'served';
  window_label?: string;
  created_at: string;
  called_at?: string;
}

// Interface for queue data
interface QueueData {
  pending: Ticket[];
  total: number;
  timestamp: string;
}

// Interface for audio call data
interface AudioCall {
  id: string;
  ticket_number: string;
  service_name: string;
  window_label: string;
  message: string;
  timestamp: number;
}

const DisplayScreen: React.FC = () => {
  // ==================== CUSTOM HOOKS ====================  // Professional Video Player with Animation-Based Audio Handling
  const useVideoPlayer = () => {
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('/video/ads.mp4');
    const [isVideoVisible, setIsVideoVisible] = useState(true);

    // Single source of truth for video state
    const videoStateRef = useRef<{
      initialized: boolean;
      playing: boolean;
      error: boolean;
      lastPlayAttempt: number;
    }>({
      initialized: false,
      playing: false,
      error: false,
      lastPlayAttempt: 0
    });

    // Robust video initialization
    const initializeVideo = useCallback(async () => {
      if (!videoRef.current || videoStateRef.current.initialized) return true;

      try {
        // Setup video element properties for reliability
        const video = videoRef.current;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        // Set multiple video sources for fallback
        const videoSources = [
          './video/ads.mp4',
          '/video/ads.mp4',
          'video/ads.mp4',
          './resources/video/ads.mp4',
          '/resources/video/ads.mp4'
        ];

        // Try to get video from API first (priority: default > most recent > first available)
        try {
          // 1. Try to get user's saved default video first
          const defaultResult = await Promise.race([
            window.api.videoGetDefault(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 1000))
          ]) as any;

          if (defaultResult?.success && defaultResult.video) {
            videoSources.unshift(`./video/${defaultResult.video}`);
          } else {
            // 2. Fallback to most recent video
            const apiResult = await Promise.race([
              window.api.videoGetMostRecent(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 1000))
            ]) as any;

            if (apiResult?.success && apiResult.video) {
              videoSources.unshift(`./video/${apiResult.video}`);
            }
          }
        } catch (apiError) {
          // Fallback to first available video
          try {
            const fallbackResult = await window.api.videoGetFirstAvailable() as any;
            if (fallbackResult?.success && fallbackResult.video) {
              videoSources.unshift(`./video/${fallbackResult.video}`);
            }
          } catch (fallbackError) {
            // Silent fallback to default sources
          }
        }

        // Try each video source until one works
        for (const source of videoSources) {
          try {
            video.src = source;
            setCurrentVideoUrl(source);

            // Wait for video to be ready with shorter timeout
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Video load timeout for: ${source}`));
              }, 2000); // 2 second timeout per source

              const onLoadedData = () => {
                clearTimeout(timeout);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                video.removeEventListener('canplaythrough', onCanPlayThrough);
                resolve();
              };

              const onCanPlayThrough = () => {
                clearTimeout(timeout);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                video.removeEventListener('canplaythrough', onCanPlayThrough);
                resolve();
              };

              const onError = (e: any) => {
                clearTimeout(timeout);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                video.removeEventListener('canplaythrough', onCanPlayThrough);
                reject(new Error(`Video load error: ${e.message || 'Unknown error'}`));
              };

              video.addEventListener('loadeddata', onLoadedData);
              video.addEventListener('canplaythrough', onCanPlayThrough);
              video.addEventListener('error', onError);

              // Force load attempt
              video.load();
            });

            setIsVideoReady(true);
            videoStateRef.current.initialized = true;
            setVideoError(null);
            return true;

          } catch (sourceError) {
            // Continue to next source
          }
        }

        // If all sources failed, set error state but don't throw
        setVideoError('فشل في تحميل الفيديو');
        setIsVideoReady(false);
        return false;

      } catch (error) {
        setVideoError('فشل في تحميل الفيديو');
        setIsVideoReady(false);
        return false;
      }
    }, []);

    // Reliable video play - never stops, always continues
    const startVideo = useCallback(async () => {
      if (!videoRef.current) return false;

      try {
        const now = Date.now();
        // Prevent rapid play attempts
        if (now - videoStateRef.current.lastPlayAttempt < 1000) {
          return videoStateRef.current.playing;
        }

        videoStateRef.current.lastPlayAttempt = now;

        // Initialize if not done
        if (!videoStateRef.current.initialized) {
          const initialized = await initializeVideo();
          if (!initialized) return false;
        }

        const video = videoRef.current;

        // Only play if not already playing
        if (!videoStateRef.current.playing && video.paused) {
          await video.play();
          videoStateRef.current.playing = true;
          videoStateRef.current.error = false;
          setIsVideoReady(true);
        }

        return true;
      } catch (error) {
        videoStateRef.current.error = true;
        return false;
      }
    }, [initializeVideo]);

    // Animation-based hide for audio (never pause the video)
    const hideForAudio = useCallback(async () => {
      setIsVideoVisible(false);
      return true;
    }, []);

    // Animation-based show after audio (video continues playing)
    const showAfterAudio = useCallback(async () => {
      setIsVideoVisible(true);
      return true;
    }, []);

    return {
      isVideoReady,
      videoError,
      currentVideoUrl,
      setCurrentVideoUrl,
      isVideoVisible,
      videoState: videoStateRef.current,
      startVideo,
      hideForAudio,
      showAfterAudio,
      initializeVideo
    };
  };

  // Custom Audio Manager Hook
  const useAudioManager = () => {
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioInitializedRef = useRef(false);

    const playAnnouncement = useCallback(async (ticketNumber: string, windowLabel: string) => {
      try {
        setAudioError(null);
        // استخدام API احترافي للصوت
        const result = await window.api.audioPlayAnnouncement(ticketNumber, windowLabel);
        if (result?.success) {
          return true;
        } else {
          throw new Error(result?.message || 'Failed to play announcement');
        }
      } catch (error) {
        setAudioError(error instanceof Error ? error.message : 'Unknown audio error');
        return false;
      }
    }, []);

    const checkAudioStatus = useCallback(async () => {
      try {
        // منع التحقق المتكرر
        if (audioInitializedRef.current) {
          return isAudioReady;
        }

        const result = await window.api.audioIsEnabled();
        const isEnabled = result?.enabled || false;
        setIsAudioReady(isEnabled);
        audioInitializedRef.current = true;

        return isEnabled;
      } catch (error) {
        setIsAudioReady(false);
        audioInitializedRef.current = false;
        return false;
      }
    }, [isAudioReady]);

    return {
      isAudioReady,
      audioError,
      playAnnouncement,
      checkAudioStatus
    };
  };

  // ==================== 🔊 AUDIO SEQUENCE PLAYER ====================
  // Function to play audio files in sequence (مُحسَّن بدون logs مفرطة)
  const playAudioSequence = useCallback(async (audioFiles: string[]): Promise<void> => {
    if (!audioFiles || audioFiles.length === 0) {
      return;
    }

    try {
      for (let i = 0; i < audioFiles.length; i++) {
        const fileName = audioFiles[i];
        // Try different audio paths - check resources directory first
        const possiblePaths = [
          `/voice/${fileName}`, // Current path
          `./voice/${fileName}`, // Relative path
          `voice/${fileName}`, // Without leading slash
          `/resources/voice/${fileName}` // Full resources path
        ];

        // Create and play audio element - try each path until one works
        let audio: HTMLAudioElement | null = null;
        let audioLoaded = false;

        for (const audioPath of possiblePaths) {
          try {
            audio = new Audio(audioPath);
            audio.volume = 1.0; // Full volume

            // Test if the audio can be loaded
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Load timeout: ${audioPath}`));
              }, 2000);

              audio!.oncanplaythrough = () => {
                clearTimeout(timeout);
                audioLoaded = true;
                resolve();
              };

              audio!.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`Failed to load: ${audioPath}`));
              };

              audio!.load();
            });

            if (audioLoaded) break; // Successfully loaded, stop trying other paths
          } catch (error) {
            audio = null;
          }
        }

        if (!audio || !audioLoaded) {
          throw new Error(`Failed to load audio file: ${fileName} from any path`);
        }

        // Wait for this audio to finish before playing next
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            audio!.pause();
            reject(new Error(`Audio timeout: ${fileName}`));
          }, 10000); // 10 second timeout per file

          audio!.onended = () => {
            clearTimeout(timeout);
            resolve();
          };

          audio!.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Failed to play: ${fileName}`));
          };

          // Start playing the already loaded audio
          audio!.play().catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // Small delay between audio files
        if (i < audioFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // ✅ DUPLICATE PREVENTION: Function to add audio call safely (Enhanced)
  const addAudioCallSafely = useCallback((audioCall: AudioCall) => {
    // Create unique key based on ticket number and window
    const audioKey = `${audioCall.ticket_number}-${audioCall.window_label}`;

    // Check if this audio call was already played recently (within 30 seconds)
    if (playedAudioCallsRef.current.has(audioKey)) {
      return;
    }

    // Add to queue and mark as played
    setAudioQueue(prev => {
      // Check if this audio call is already in current queue
      const alreadyInQueue = prev.some(existing =>
        existing.ticket_number === audioCall.ticket_number &&
        existing.window_label === audioCall.window_label
      );

      if (alreadyInQueue) {
        return prev;
      }

      // ✅ SEQUENTIAL GUARANTEE: Add to end of queue for strict sequential processing
      const newQueue = [...prev, audioCall];

      return newQueue;
    });

    playedAudioCallsRef.current.add(audioKey);

    // Clean up tracking after 30 seconds
    setTimeout(() => {
      playedAudioCallsRef.current.delete(audioKey);
    }, 30000);
  }, []);

  // Initialize custom hooks
  const videoPlayer = useVideoPlayer();
  const audioManager = useAudioManager();

  // ==================== SERVICES DATA ====================
  const { services } = useAdminServices();

  // Helper function to get service name by ID
  const getServiceName = useCallback((serviceId: number): string => {
    if (!services || services.length === 0) {
      return 'خدمة غير محددة';
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return 'خدمة غير محددة';
    }

    return service.name;
  }, [services]);

  // Video change functionality
  const handleVideoChange = async () => {
    if (isChangingVideo) return;

    try {
      setIsChangingVideo(true);
      setVideoChangeStatus('جاري فتح نافذة اختيار الملف...');

      // Open file selection dialog
      const selectResult = await window.api.videoSelectNewVideo();

      if (!selectResult?.success) {
        setVideoChangeStatus('تم إلغاء اختيار الملف');
        return;
      }

      setVideoChangeStatus('جاري نسخ وتعيين الفيديو الجديد...');

      // Set the new video as default
      if (!selectResult.filePath) {
        setVideoChangeStatus('لم يتم اختيار ملف فيديو صالح');
        return;
      }
      const setResult = await window.api.videoSetNewDefault(selectResult.filePath);

      if (setResult?.success) {
        setVideoChangeStatus('تم تغيير الفيديو بنجاح! 🎉');

        // Update video immediately with the new file
        const video = videoRef.current;
        if (video && setResult.fileName) {
          try {
            const newVideoUrl = `./video/${setResult.fileName}`;
            video.src = newVideoUrl;
            videoPlayer.setCurrentVideoUrl(newVideoUrl);
            video.load();
            await video.play();
          } catch (videoError) {
            // Fallback to initialization
            setTimeout(() => {
              videoPlayer.initializeVideo();
            }, 500);
          }
        }

        // Close the dialog after 2 seconds
        setTimeout(() => {
          setShowControlDialog(false);
        }, 2000);
      } else {
        setVideoChangeStatus(`خطأ: ${setResult?.message || 'فشل في تعيين الفيديو'}`);
      }
    } catch (error) {
      setVideoChangeStatus(`خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      // Clear status after 5 seconds
      setTimeout(() => {
        setIsChangingVideo(false);
        setVideoChangeStatus('');
      }, 5000);
    }
  };

  // Control functions
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleExit = async () => {
    try {
      if (window.api && window.api.closeWindow) {
        await window.api.closeWindow('display')
      } else {
        window.close()
      }
    } catch (error) {
      // Fallback to direct window close
      window.close()
    }
  }

  // Listen for fullscreen changes and keyboard shortcuts
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault()
        handleFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close dialog when clicking outside
  const handleDialogBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setShowControlDialog(false)
    }
  }

  // ==================== STATE MANAGEMENT ====================
  const [currentTime, setCurrentTime] = useState(new Date());
  const [queueData, setQueueData] = useState<QueueData>({ pending: [], total: 0, timestamp: '' });
  const [currentAudioCall, setCurrentAudioCall] = useState<AudioCall | null>(null);
  const [audioQueue, setAudioQueue] = useState<AudioCall[]>([]);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  // Control dialog state
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChangingVideo, setIsChangingVideo] = useState(false);
  const [videoChangeStatus, setVideoChangeStatus] = useState<string>('');

  // ✅ NEW: Dynamic screen size management
  const [maxVisibleTickets, setMaxVisibleTickets] = useState(10);
  const [visibleTickets, setVisibleTickets] = useState<Ticket[]>([]);

  // Refs for preventing duplicate initialization
  const initializationRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);

  // ✅ NEW: Track played audio calls to prevent duplicates
  const playedAudioCallsRef = useRef<Set<string>>(new Set());

  // ==================== CONNECTION MANAGEMENT ====================
  const {
    isReady,
    isConnected,
    isConnecting,
    isDiscovering,
    isRegistering,
    serverInfo,
    connectionError,
    discoveryError,
    registrationError,
    deviceInfo,
    initialize,
    reconnect,
    onEvent,
    clearErrors
  } = useServerConnection();

  // ==================== PRINTER REGISTRATION (Display Screen Only) ====================
  const {
    isRegistering: isPrinterRegistering,
    registerPrintersToDatabase
  } = useDisplayPrinterRegistration(isReady);

  // ==================== INITIALIZATION ====================
  // Initialize connection on component mount (discovery → socket → register device)
  useEffect(() => {
    const initializeDisplayConnection = async () => {
      try {
        if (initializationRef.current) {
          return;
        }

        if (isReady) {
          return;
        }

        initializationRef.current = true;

        // Clear any previous errors
        clearErrors();

        // 🔄 PERSISTENT STORAGE: Try to recover previous state first
        try {
          if (deviceInfo?.device_id) {
            const recoveredData = await window.api.persistentRecoverDeviceData(deviceInfo.device_id);
            if (recoveredData?.success && recoveredData.data?.display) {
              const displayData = recoveredData.data.display;

              // Restore queue data
              if (displayData.queueData) {
                setQueueData({
                  pending: displayData.queueData.pending || [],
                  total: displayData.queueData.total || 0,
                  timestamp: displayData.queueData.timestamp || new Date().toISOString()
                });
              }

              // Restore audio queue
              if (displayData.audioQueue) {
                setAudioQueue(displayData.audioQueue);
              }

              // Restore current audio call
              if (displayData.currentAudioCall) {
                setCurrentAudioCall(displayData.currentAudioCall);
              }
            }
          }
        } catch (persistentError) {
          // Silent error handling for persistent storage
        }

        // Initialize with display device type (discovery → socket → register device)
        await initialize('display');

      } catch (error) {
        // Silent error handling
      } finally {
        initializationRef.current = false;
      }
    };

    initializeDisplayConnection();
  }, []);

  // ==================== 🔄 PERSISTENT STORAGE AUTO-SAVE ====================
  // Auto-save queue data when it changes
  useEffect(() => {
    if (deviceInfo?.device_id && queueData.pending.length >= 0) {
      const saveQueueData = async () => {
        try {
          await window.api.persistentSaveQueueData(deviceInfo.device_id, queueData);
        } catch (error) {
          // Silent error handling
        }
      };

      const timeoutId = setTimeout(saveQueueData, 1000); // Debounce for 1 second
      return () => clearTimeout(timeoutId);
    }
    return () => {}; // Return cleanup function for all paths
  }, [queueData, deviceInfo?.device_id]);

  // Auto-save audio queue when it changes
  useEffect(() => {
    if (deviceInfo?.device_id && audioQueue.length >= 0) {
      const saveAudioQueue = async () => {
        try {
          await window.api.persistentSaveAudioQueue(deviceInfo.device_id, audioQueue, currentAudioCall);
        } catch (error) {
          // Silent error handling
        }
      };

      const timeoutId = setTimeout(saveAudioQueue, 500); // Debounce for 500ms
      return () => clearTimeout(timeoutId);
    }
    return () => {}; // Return cleanup function for all paths
  }, [audioQueue, currentAudioCall, deviceInfo?.device_id]);

  // ==================== PRINTER REGISTRATION AFTER DEVICE REGISTRATION ====================
  // Register local printers to database after successful device registration
  useEffect(() => {
    const shouldRegisterPrinters = isReady &&
                                  isConnected &&
                                  deviceInfo?.device_id &&
                                  !isPrinterRegistering;

    if (shouldRegisterPrinters) {
      // تأخير قصير للتأكد من استقرار الاتصال
      const timer = setTimeout(() => {
        registerPrintersToDatabase(deviceInfo.device_id);
      }, 3000); // 3 ثوانِ تأخير

      return () => clearTimeout(timer);
    }

    // Return undefined if no cleanup is needed
    return undefined;
  }, [isReady, isConnected, deviceInfo?.device_id, isPrinterRegistering, registerPrintersToDatabase]);  // Initialize Video and Audio after connection is ready - 🎬 AUTONOMOUS VIDEO SYSTEM
  useEffect(() => {
    if (!isConnected) return;

    let isMounted = true;

    const initializeMediaSystems = async () => {
      try {
        // 🎵 Initialize Audio System (High Priority)
        await audioManager.checkAudioStatus();

        // Initialize Video System (Independent & Robust)
        if (isMounted && !currentAudioCall) {
          const videoSuccess = await videoPlayer.startVideo();
          if (!videoSuccess) {
            // Silent error handling
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Delay initialization slightly to prioritize connection stability
    const timeoutId = setTimeout(initializeMediaSystems, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isConnected, currentAudioCall, audioManager, videoPlayer]);

  // 🎬 AUTONOMOUS VIDEO HEALTH MONITOR - مراقب صحة الفيديو المستقل
  useEffect(() => {
    if (!isConnected || !videoRef.current) return;

    let healthCheckInterval: NodeJS.Timeout;

    const startVideoHealthMonitor = () => {
      healthCheckInterval = setInterval(async () => {
        const video = videoRef.current;
        if (!video || currentAudioCall) return;

        // Check if video is healthy
        const isStalled = video.readyState < 3; // HAVE_FUTURE_DATA
        const isPaused = video.paused;
        const hasError = video.error;

        // Also check if video source has changed but not updated
        const currentSrc = video.src;
        const expectedSrc = videoPlayer.currentVideoUrl;
        const srcMismatch = currentSrc !== expectedSrc && expectedSrc;

        if (hasError || isStalled || (isPaused && videoPlayer.isVideoVisible) || srcMismatch) {
          try {
            // If source mismatch, update it first
            if (srcMismatch) {
              video.src = expectedSrc;
              video.load();
            }
            // Attempt to restart video
            await videoPlayer.startVideo();
          } catch (repairError) {
            // Silent error handling
          }
        }
      }, 5000); // Check every 5 seconds
    };

    // Start health monitoring after a delay
    const timeoutId = setTimeout(startVideoHealthMonitor, 3000);

    return () => {
      clearTimeout(timeoutId);
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [isConnected, currentAudioCall, videoPlayer]);

  // Initialize Tickets immediately after connection (أولوية عالية)
  useEffect(() => {
    if (!isConnected) return;

    // جلب التذاكر فوراً بدون أي تأخير
    const loadInitialTickets = async () => {
      try {
        // محاولة جلب التذاكر المعلقة من API
        const pendingResult = await window.api.getPendingTickets();
        if (pendingResult?.success && pendingResult.data) {
          setQueueData({
            pending: pendingResult.data,
            total: pendingResult.data.length,
            timestamp: new Date().toISOString()
          });
        } else {
          // محاولة جلب الحالة العامة للطابور
          const queueResult = await window.api.getQueueStatus();
          if (queueResult?.success && queueResult.data) {
            setQueueData({
              pending: queueResult.data.pending || [],
              total: queueResult.data.total || 0,
              timestamp: queueResult.data.timestamp || new Date().toISOString()
            });
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // تشغيل فوري بدون setTimeout
    loadInitialTickets();
  }, [isConnected]);

  // ==================== TIME MANAGEMENT ====================
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ==================== DYNAMIC SCREEN SIZE MANAGEMENT ====================
  // Calculate how many tickets can fit on screen to prevent scrolling
  const calculateMaxVisibleTickets = useCallback(() => {
    if (!queueContainerRef.current) return 8; // Default fallback

    const container = queueContainerRef.current;
    const containerHeight = container.clientHeight;

    // Responsive calculations based on screen size
    const isSmallScreen = window.innerWidth < 768;
    const isMediumScreen = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Adjust dimensions based on screen size
    const containerPadding = isSmallScreen ? 32 : isMediumScreen ? 48 : 64;
    const headerHeight = isSmallScreen ? 60 : isMediumScreen ? 70 : 88;
    const ticketCardHeight = isSmallScreen ? 80 : isMediumScreen ? 100 : 120;
    const ticketGap = isSmallScreen ? 8 : isMediumScreen ? 12 : 16;

    const availableHeight = containerHeight - containerPadding - headerHeight;
    const ticketWithGap = ticketCardHeight + ticketGap;

    const maxTickets = Math.floor(availableHeight / ticketWithGap);

    // Ensure we always show at least 3 tickets but adjust max based on screen size
    const minTickets = 3;
    const maxTicketsLimit = isSmallScreen ? 8 : isMediumScreen ? 12 : 15;

    return Math.max(minTickets, Math.min(maxTickets, maxTicketsLimit));
  }, []);

  // Update screen dimensions and calculate max visible tickets
  useEffect(() => {
    const updateScreenDimensions = () => {
      // Calculate max visible tickets based on screen size
      const newMaxTickets = calculateMaxVisibleTickets();
      setMaxVisibleTickets(newMaxTickets);
    };

    // Initial calculation
    updateScreenDimensions();

    // Listen for window resize
    window.addEventListener('resize', updateScreenDimensions);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenDimensions);
  }, [calculateMaxVisibleTickets]);

  // Update visible tickets when queue data or max visible tickets changes
  useEffect(() => {
    if (queueData.pending.length === 0) {
      setVisibleTickets([]);
      return;
    }

    // Show only the tickets that can fit on screen
    const ticketsToShow = queueData.pending.slice(0, maxVisibleTickets);
    setVisibleTickets(ticketsToShow);
  }, [queueData.pending, maxVisibleTickets]);  // ==================== INSTANT PRINT CHECKER WITH DEBOUNCING ====================
  const pendingCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced pending ticket checker that runs immediately
  const checkPendingTicketsInstantly = useCallback(async () => {
    console.log('🔍 Starting instant check for pending tickets...');

    try {
      // Get pending tickets from API
      const pendingResult = await window.api.getPendingTickets();
      console.log('📊 Pending tickets result:', pendingResult);

      if (pendingResult?.success && pendingResult.data && pendingResult.data.length > 0) {
        console.log(`📝 Found ${pendingResult.data.length} total pending tickets`);

        // Find tickets that need printing (print_status = 'pending')
        const ticketsNeedingPrint = pendingResult.data.filter((ticket: any) =>
          ticket.print_status === 'pending'
        );

        console.log(`🖨️ Found ${ticketsNeedingPrint.length} tickets needing print`);

        if (ticketsNeedingPrint.length > 0) {
          // Print each ticket immediately with parallel processing for speed
          const printPromises = ticketsNeedingPrint.map(async (ticket, index) => {
            try {
              console.log(`🎫 Processing ticket #${ticket.ticket_number} (${index + 1}/${ticketsNeedingPrint.length})`);

              // Add small staggered delay to prevent printer overload
              await new Promise(resolve => setTimeout(resolve, index * 100));

              // ✅ Ensure we have the full service name from the database
              let finalServiceName = ticket.service_name;

              // Check if service name needs fetching from database
              if (!finalServiceName ||
                  finalServiceName.trim() === '' ||
                  finalServiceName === 'خدمة' ||
                  finalServiceName.length < 3) {

                try {
                  console.log(`🔍 Fetching service name for ticket #${ticket.ticket_number}`);
                  const serviceResponse = await window.api.getServiceById(ticket.service_id);
                  if (serviceResponse?.success && serviceResponse.data?.name) {
                    finalServiceName = serviceResponse.data.name;
                    console.log(`✅ Service name fetched: ${finalServiceName}`);
                  }
                } catch (serviceError) {
                  console.error('❌ Failed to fetch service name:', serviceError);
                }
              }

              // Prepare ticket data for printing
              const ticketData = {
                id: ticket.id,
                ticket_number: ticket.ticket_number,
                service_id: ticket.service_id,
                service_name: finalServiceName, // ✅ Use the full service name
                created_at: ticket.created_at,
                company_name: "", // ✅ Always empty string as requested
                position: ticket.position || 1,
                print_source: 'instant-display'
              };

              console.log(`🖨️ Starting print for ticket #${ticket.ticket_number}`);

              // Print ticket immediately
              const printResult = await window.api.printTicket(ticketData, 'default');

              console.log(`📄 Print result for ticket #${ticket.ticket_number}:`, printResult);

              if (printResult && printResult.success) {
                console.log(`✅ Print successful for ticket #${ticket.ticket_number}`);
                // Update print status to printed
                try {
                  await window.api.updatePrintStatus(ticket.id, 'printed');
                  console.log(`✅ Status updated to 'printed' for ticket #${ticket.ticket_number}`);
                } catch (statusError) {
                  console.error('❌ Failed to update print status:', statusError);
                }
              } else {
                console.error(`❌ Print failed for ticket #${ticket.ticket_number}`);
                // Mark as failed
                try {
                  await window.api.updatePrintStatus(ticket.id, 'print_failed');
                  console.log(`⚠️ Status updated to 'print_failed' for ticket #${ticket.ticket_number}`);
                } catch (statusError) {
                  console.error('❌ Failed to update print status to failed:', statusError);
                }
              }

            } catch (printError) {
              console.error(`❌ Error processing ticket #${ticket.ticket_number}:`, printError);
            }
          });

          // Wait for all prints to complete
          await Promise.allSettled(printPromises);
          console.log('✅ All print operations completed');
        } else {
          console.log('ℹ️ No tickets need printing');
        }

        // Update queue data with fresh data
        setQueueData({
          pending: pendingResult.data,
          total: pendingResult.data.length,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('ℹ️ No pending tickets found');
      }
    } catch (error) {
      console.error('❌ Error in instant ticket check:', error);
    }
  }, []);

  // Debounced version of the instant checker
  const triggerInstantCheck = useCallback(() => {
    // Clear existing timeout to debounce
    if (pendingCheckTimeoutRef.current) {
      clearTimeout(pendingCheckTimeoutRef.current);
    }

    // Set new timeout for debounced execution
    pendingCheckTimeoutRef.current = setTimeout(() => {
      checkPendingTicketsInstantly();
    }, 50); // 50ms debounce for ultra-fast response
  }, [checkPendingTicketsInstantly]);

  // ==================== REAL-TIME EVENT LISTENERS ====================
  // Listen for real-time events after connection is established (أولوية عالية للتذاكر)
  useEffect(() => {
    if (!isConnected) return;

    // 🚀 NEW: Listen for ticket creation (HIGHEST PRIORITY)
    const unsubscribeTicketCreated = onEvent('ticket:created', (data: any) => {
      console.log('🎫 TICKET CREATED EVENT:', data);

      // Update queue data immediately
      if (data && data.ticket) {
        console.log(`📝 Adding ticket #${data.ticket.ticket_number} to queue`);
        setQueueData(prev => ({
          pending: [...prev.pending, data.ticket],
          total: prev.total + 1,
          timestamp: new Date().toISOString()
        }));
      }

      // Trigger IMMEDIATE print check for new tickets (highest priority)
      console.log('🔄 Triggering instant print check...');
      checkPendingTicketsInstantly();
    });    // Listen for queue updates with instant print check (أولوية عالية)
    const unsubscribeQueueUpdate = onEvent('queue:updated', (data: any) => {
      console.log('🔄 QUEUE UPDATE EVENT:', data);

      // ✅ IMMEDIATE QUEUE UPDATE: Always update queue regardless of audio state
      if (data.tickets) {
        console.log(`📊 Updating queue with ${data.tickets.length} tickets`);
        setQueueData({
          pending: data.tickets,
          total: data.total || 0,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }

      // Trigger instant print check
      console.log('🔄 Queue updated - triggering instant print check...');
      triggerInstantCheck();
    });

    // ✅ NEW: Listen for ticket status changes (served, called, etc.)
    const unsubscribeTicketStatusChange = onEvent('ticket:status-changed', async () => {
      // Refresh queue immediately when any ticket status changes
      try {
        const pendingResult = await window.api.getPendingTickets();
        if (pendingResult?.success && pendingResult.data) {
          setQueueData({
            pending: pendingResult.data,
            total: pendingResult.data.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Silent error handling
      }
    });

    // ✅ NEW: Listen for ticket served events (removes from queue)
    const unsubscribeTicketServed = onEvent('ticket:served', async () => {
      // Refresh queue immediately when tickets are served
      try {
        const pendingResult = await window.api.getPendingTickets();
        if (pendingResult?.success && pendingResult.data) {
          setQueueData({
            pending: pendingResult.data,
            total: pendingResult.data.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Silent error handling
      }
    });

    // Listen for real-time updates (أولوية عالية) - تحديث مستمر
    const unsubscribeRealtimeUpdate = onEvent('realtime:update', (data: any) => {
      // ✅ تحديث مستمر للقائمة حتى أثناء الصوت
      if (data.tickets) {
        setQueueData({
          pending: data.tickets,
          total: data.total || 0,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }

      // Also trigger instant print check for realtime updates
      triggerInstantCheck();
    });

    // Listen for initial data (أولوية عالية - أول شيء نريده)
    const unsubscribeInitialData = onEvent('initial-data', (data: any) => {
      if (data.pendingTickets) {
        setQueueData({
          pending: data.pendingTickets,
          total: data.allTickets?.length || 0,
          timestamp: data.serverTime || new Date().toISOString()
        });

        // Check for any pending prints in initial data
        triggerInstantCheck();
      }
    });

    // Listen for ticket called events (for audio announcements + real-time queue update)
    const unsubscribeTicketCalled = onEvent('ticket:called', async (data: any) => {
      // ✅ IMMEDIATE QUEUE UPDATE: Update queue first, then handle audio
      try {
        // Fetch fresh queue data immediately after a ticket is called
        const pendingResult = await window.api.getPendingTickets();
        if (pendingResult?.success && pendingResult.data) {
          setQueueData({
            pending: pendingResult.data,
            total: pendingResult.data.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Silent error handling for queue update
      }

      // ✅ SEQUENTIAL AUDIO: Add to audio queue (will be processed one by one)
      const audioCall: AudioCall = {
        id: `${data.ticket_number}-${Date.now()}`,
        ticket_number: data.ticket_number,
        service_name: data.service_name || 'خدمة',
        window_label: data.window_label || `شباك ${data.window_id}`,
        message: `تذكرة رقم ${data.ticket_number} ${data.service_name ? `لخدمة ${data.service_name}` : ''} الرجاء التوجه إلى ${data.window_label || `شباك ${data.window_id}`}`,
        timestamp: Date.now()
      };

      addAudioCallSafely(audioCall);
    });

    // Listen for display-specific ticket calls (with real-time queue update)
    const unsubscribeDisplayTicketCalled = onEvent('display:ticket-called', async (data: any) => {
      // ✅ IMMEDIATE QUEUE UPDATE: Update queue first, then handle audio
      try {
        // Fetch fresh queue data immediately after a ticket is called
        const pendingResult = await window.api.getPendingTickets();
        if (pendingResult?.success && pendingResult.data) {
          setQueueData({
            pending: pendingResult.data,
            total: pendingResult.data.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Silent error handling for queue update
      }

      // ✅ SEQUENTIAL AUDIO: Add to audio queue (will be processed one by one)
      const audioCall: AudioCall = {
        id: `display-${data.ticket_number}-${Date.now()}`,
        ticket_number: data.ticket_number,
        service_name: data.service_name || 'خدمة',
        window_label: data.window_label || `شباك ${data.window_id}`,
        message: `تذكرة رقم ${data.ticket_number} ${data.service_name ? `لخدمة ${data.service_name}` : ''} الرجاء التوجه إلى ${data.window_label || `شباك ${data.window_id}`}`,
        timestamp: Date.now()
      };

      addAudioCallSafely(audioCall);
    });

    // ⚡ INSTANT PRINT LISTENER: Listen for tickets that need immediate printing
    const unsubscribeInstantPrint = onEvent('print:pending-instant', async (data: any) => {
      console.log('🚀 INSTANT PRINT EVENT RECEIVED:', data);

      // ⚡ Instant print processing
      try {
        // ✅ Immediate validation and logging
        if (!data || !data.ticketData || !data.ticketData.id) {
          console.error('❌ Invalid ticket data received:', data);
          return;
        }

        console.log(`🎫 Processing instant print for ticket #${data.ticketData.ticket_number}`);

        // ✅ Ensure we have the full service name from the database
        let finalServiceName = data.ticketData.service_name;

        // Check if service name needs fetching from database
        if (!finalServiceName ||
            finalServiceName.trim() === '' ||
            finalServiceName === 'خدمة' ||
            finalServiceName.length < 3) {

          try {
            console.log(`🔍 Fetching service name for service_id: ${data.ticketData.service_id}`);
            const serviceResponse = await window.api.getServiceById(data.ticketData.service_id);
            if (serviceResponse?.success && serviceResponse.data?.name) {
              finalServiceName = serviceResponse.data.name;
              console.log(`✅ Service name fetched: ${finalServiceName}`);
            }
          } catch (serviceError) {
            console.error('❌ Failed to fetch service name:', serviceError);
          }
        }

        // ✅ Use the finalized ticket data with guaranteed full service name
        const serverTicketData = {
          ...data.ticketData,
          service_name: finalServiceName, // ✅ Use the full service name (either from server or fetched from DB)
          company_name: "" // ✅ Ensure empty company name
        };

        console.log(`🖨️ Starting print process for ticket #${serverTicketData.ticket_number}`);

        // Print immediately using the finalized ticket data
        const printResult = await window.api.printTicket(serverTicketData, 'default');

        console.log(`📄 Print result:`, printResult);

        if (printResult && printResult.success) {
          console.log(`✅ Print successful for ticket #${serverTicketData.ticket_number}`);
          // ✅ تحديث حالة الطباعة في قاعدة البيانات عند نجاح الطباعة
          try {
            await window.api.updatePrintStatus(data.ticketData.id, 'printed');
            console.log(`✅ Print status updated to 'printed' for ticket #${serverTicketData.ticket_number}`);
          } catch (statusError) {
            console.error('❌ Failed to update print status:', statusError);
          }
        } else {
          console.error(`❌ Print failed for ticket #${serverTicketData.ticket_number}:`, printResult);
          // ✅ Mark as print_failed to prevent backup system from re-trying
          try {
            await window.api.updatePrintStatus(data.ticketData.id, 'print_failed');
            console.log(`⚠️ Print status updated to 'print_failed' for ticket #${serverTicketData.ticket_number}`);
          } catch (statusError) {
            console.error('❌ Failed to update print status to failed:', statusError);
          }
        }
      } catch (error) {
        console.error('❌ Error in instant print processing:', error);
        // Try to mark as failed if we have ticket data
        if (data?.ticketData?.id) {
          try {
            await window.api.updatePrintStatus(data.ticketData.id, 'print_failed');
          } catch (statusError) {
            console.error('❌ Failed to update print status after error:', statusError);
          }
        }
      }
    });

    // Display Print Handler
    const unsubscribeSimplifiedPrint = onEvent('display:print-ticket', async (data: any) => {
      try {

        // ✅ Ensure we have the full service name from the database
        let finalServiceName = data.ticketData.service_name;

        // Check if service name needs fetching from database
        if (!finalServiceName ||
            finalServiceName.trim() === '' ||
            finalServiceName === 'خدمة' ||
            finalServiceName.length < 3) {

          try {
            const serviceResponse = await window.api.getServiceById(data.ticketData.service_id);
            if (serviceResponse?.success && serviceResponse.data?.name) {
              finalServiceName = serviceResponse.data.name;
            }
          } catch (serviceError) {
            // Silent fallback to provided name
          }
        }

        // ✅ Use the finalized ticket data with guaranteed full service name
        const finalTicketData = {
          ...data.ticketData,
          service_name: finalServiceName, // ✅ Use the full service name
          company_name: "" // ✅ Ensure empty company name
        };

        const printResult = await window.api.printTicket(finalTicketData, data.printerName);

        if (printResult && printResult.success) {
          // ✅ تحديث حالة الطباعة في قاعدة البيانات عند نجاح الطباعة
          try {
            await window.api.updatePrintStatus(data.ticketData.id, 'printed');
          } catch (statusError) {
            // Silent error handling
          }
        }

      } catch (error) {
        // Silent error handling
      }
    });

    // Cleanup listeners on unmount
    // ==================== 🔊 IPC AUDIO EVENT LISTENERS ====================
    const setupAudioEventListeners = () => {
      if (window.electron?.ipcRenderer) {
        // Listen for audio announcement commands from AudioService
        window.electron.ipcRenderer.on('audio:play-announcement', async (_event, data) => {
          if (data.audioFiles && data.ticketNumber && data.windowLabel) {
            const audioCall: AudioCall = {
              id: `audio-${data.ticketNumber}-${Date.now()}`,
              ticket_number: data.ticketNumber,
              service_name: 'خدمة',
              window_label: data.windowLabel,
              message: `تذكرة رقم ${data.ticketNumber} الرجاء التوجه إلى ${data.windowLabel}`,
              timestamp: Date.now()
            };

            addAudioCallSafely(audioCall);

            try {
              await playAudioSequence(data.audioFiles);
            } catch (audioError) {
              // Silent error handling
            }
          }
        });

        return () => {
          window.electron?.ipcRenderer.removeAllListeners('audio:play-announcement');
        };
      }
      return () => {};
    };

    const cleanupAudioListeners = setupAudioEventListeners();

    // ==================== 🎬 VIDEO EVENT LISTENERS ====================
    const setupVideoEventListeners = () => {
      if (window.electron?.ipcRenderer) {
        // Listen for video play commands from main process
        window.electron.ipcRenderer.on('video:play-mp4-loop', async (_event, data) => {
          try {
            const video = videoRef.current;
            if (!video) return;

            // Update video source
            const newSrc = data.videoUrl || `./video/${data.videoPath}`;
            if (video.src !== newSrc) {
              video.src = newSrc;
              videoPlayer.setCurrentVideoUrl(newSrc);

              // Reload and play the new video
              video.load();
              await video.play();
            }
          } catch (error) {
            // Silent error handling
          }
        });

        // Listen for video stop commands
        window.electron.ipcRenderer.on('video:stop-video', async (_event, _data) => {
          try {
            const video = videoRef.current;
            if (video) {
              video.pause();
            }
          } catch (error) {
            // Silent error handling
          }
        });

        return () => {
          window.electron?.ipcRenderer.removeAllListeners('video:play-mp4-loop');
          window.electron?.ipcRenderer.removeAllListeners('video:stop-video');
        };
      }
      return () => {};
    };

    const cleanupVideoListeners = setupVideoEventListeners();

    // System reset listener - refresh queue data when system is reset
    const unsubscribeSystemReset = onEvent('system:reset', async () => {
      try {
        // Clear current audio queue and queue data
        setAudioQueue([]);
        setCurrentAudioCall(null);
        setQueueData({ pending: [], total: 0, timestamp: new Date().toISOString() });

        // Refresh queue data after a short delay to ensure backend has completed reset
        setTimeout(async () => {
          try {
            const pendingResult = await window.api.getPendingTickets();
            if (pendingResult?.success) {
              setQueueData({
                pending: pendingResult.data || [],
                total: pendingResult.data?.length || 0,
                timestamp: new Date().toISOString()
              });
            }
          } catch (refreshError) {
            // Silent error handling
          }
        }, 2000); // 2 second delay to ensure server has completed reset

      } catch (error) {
        // Silent error handling
      }
    });

    return () => {
      unsubscribeTicketCreated();
      unsubscribeQueueUpdate();
      unsubscribeTicketStatusChange();
      unsubscribeTicketServed();
      unsubscribeRealtimeUpdate();
      unsubscribeTicketCalled();
      unsubscribeDisplayTicketCalled();
      unsubscribeInitialData();
      unsubscribeInstantPrint();
      unsubscribeSimplifiedPrint();
      unsubscribeSystemReset();
      cleanupAudioListeners();
      cleanupVideoListeners();
    };
  }, [isConnected, onEvent, addAudioCallSafely]);

  // ==================== 🔄 BACKUP POLLING SYSTEM ====================
  useEffect(() => {
    if (!isConnected) return;

    const checkPendingTickets = async () => {
      try {
        const pendingResult = await window.api.getPendingTickets();

        if (pendingResult?.success && pendingResult.data && pendingResult.data.length > 0) {
          const ticketsNeedingPrint = pendingResult.data.filter((ticket: any) =>
            ticket.print_status === 'pending'
          );

          if (ticketsNeedingPrint.length > 0) {
            for (const ticket of ticketsNeedingPrint) {
              try {
                try {
                  await window.api.updatePrintStatus(ticket.id, 'printing');
                } catch (markError) {
                  continue;
                }

                let finalServiceName = ticket.service_name;

                if (!finalServiceName ||
                    finalServiceName.trim() === '' ||
                    finalServiceName === 'خدمة' ||
                    finalServiceName.length < 3) {

                  try {
                    const serviceResponse = await window.api.getServiceById(ticket.service_id);
                    if (serviceResponse?.success && serviceResponse.data?.name) {
                      finalServiceName = serviceResponse.data.name;
                    }
                  } catch (serviceError) {
                    // Use provided name as fallback
                  }
                }

                const ticketData = {
                  id: ticket.id,
                  ticket_number: ticket.ticket_number,
                  service_id: ticket.service_id,
                  service_name: finalServiceName,
                  created_at: ticket.created_at,
                  company_name: "",
                  position: ticket.position || 1,
                  print_source: 'display'
                };

                const printResult = await window.api.printTicket(ticketData, 'default');

                if (printResult && printResult.success) {
                  try {
                    await window.api.updatePrintStatus(ticket.id, 'printed');
                  } catch (statusError) {
                    // Silent error handling
                  }
                } else {
                  try {
                    await window.api.updatePrintStatus(ticket.id, 'print_failed');
                  } catch (statusError) {
                    // Silent error handling
                  }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

              } catch (printError) {
                // Silent error handling
              }
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    const pollingInterval = setInterval(checkPendingTickets, 60000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isConnected]);

  // ==================== ✅ ENHANCED SEQUENTIAL AUDIO PROCESSING ====================
  useEffect(() => {
    // ✅ STRICT SEQUENTIAL: Only process if there's a queue and not currently processing
    if (audioQueue.length === 0 || isProcessingAudio) return;

    const processNextAudio = async () => {
      const nextCall = audioQueue[0];

      // ✅ PREVENT OVERLAP: Mark as processing immediately
      setIsProcessingAudio(true);
      setCurrentAudioCall(nextCall);

      // Hide video during audio announcement (animation-based)
      await videoPlayer.hideForAudio();

      // ✅ SAFE QUEUE REMOVAL: Remove processed item from queue immediately
      setAudioQueue(prev => prev.slice(1));

      try {
        // ✅ ENHANCED AUDIO: Play announcement with better error handling
        const audioSuccess = await audioManager.playAnnouncement(
          nextCall.ticket_number,
          nextCall.window_label
        );

        if (audioSuccess) {
          // ✅ SMART DURATION: Calculate duration based on content length
          const baseDuration = 8000; // Minimum 8 seconds
          const ticketNumberDuration = nextCall.ticket_number.length * 1500;
          const serviceNameDuration = nextCall.service_name.length * 150;
          const windowLabelDuration = nextCall.window_label.length * 150;
          const bufferTime = 3000; // 3 second buffer

          const calculatedDuration = baseDuration + ticketNumberDuration + serviceNameDuration + windowLabelDuration + bufferTime;
          const maxDuration = Math.min(calculatedDuration, 15000); // Cap at 15 seconds max

          // ✅ CLEANUP AFTER AUDIO COMPLETION
          setTimeout(async () => {
            setCurrentAudioCall(null);
            setIsProcessingAudio(false);

            // Show video after audio completion
            await videoPlayer.showAfterAudio();

            // ✅ REAL-TIME QUEUE UPDATE: Refresh queue after each audio call
            try {
              const pendingResult = await window.api.getPendingTickets();
              if (pendingResult?.success && pendingResult.data) {
                setQueueData({
                  pending: pendingResult.data,
                  total: pendingResult.data.length,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (queueError) {
              // Silent error handling for queue refresh
            }
          }, maxDuration);
        } else {
          // Show video immediately on audio failure
          setCurrentAudioCall(null);
          setIsProcessingAudio(false);
          await videoPlayer.showAfterAudio();
        }
      } catch (audioError) {
        // Show video on any audio processing error
        setCurrentAudioCall(null);
        setIsProcessingAudio(false);
        await videoPlayer.showAfterAudio();
      }
    };

    // ✅ IMMEDIATE PROCESSING: Start processing the next audio call
    processNextAudio();
  }, [audioQueue, isProcessingAudio, audioManager, videoPlayer]);

  // ==================== 🎬 AUTONOMOUS VIDEO AUTO-RECOVERY ====================
  // Ensure video is always running when not in audio mode
  useEffect(() => {
    if (!isConnected || currentAudioCall || !videoRef.current) return;

    const ensureVideoPlaying = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;

        // Check if video needs to be started
        if (video.paused || video.readyState < 3) {
          await videoPlayer.startVideo();
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Check video status periodically
    const recoveryInterval = setInterval(ensureVideoPlaying, 10000); // Every 10 seconds

    return () => {
      clearInterval(recoveryInterval);
    };
  }, [isConnected, currentAudioCall, videoPlayer]);

  // ==================== RENDER ====================

  return (
    <ConnectionGuard
      screenType="display"
      isReady={isReady}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isDiscovering={isDiscovering}
      isRegistering={isRegistering}
      connectionError={connectionError}
      discoveryError={discoveryError}
      registrationError={registrationError}
      serverInfo={serverInfo}
      deviceInfo={deviceInfo}
      onRetry={reconnect}
      onInitialize={() => initialize('display')}
    >
      {/* Custom styles for animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
          }

          /* Ensure no scrolling on any element */
          * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          *::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Main container - Full viewport, no scrolling */}
      <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-primary-50 to-white overflow-hidden">
        {/* Header with agency name and time - Responsive */}
        <header className="flex-shrink-0 bg-white/95 backdrop-blur-md shadow-lg border-b border-primary-200">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="flex justify-between items-center">
              {/* Left side: Logo and Agency Name */}
              <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
                {/* Agency Logo - Bigger and responsive (Secret Control Button) */}
                <button
                  onClick={() => setShowControlDialog(true)}
                  className="relative flex-shrink-0 transition-all duration-300 hover:scale-105 group"
                  title="انقر للوصول لوحة التحكم"
                >
                  <Logo size="xl" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24" />
                  {/* Subtle indicator that it's clickable */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full h-full bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </button>

                {/* Agency Name - Bigger and clearer */}
                <div className="text-right">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-primary-800 font-arabic leading-tight">
                    الصندوق الوطني للضمان الاجتماعي لغير الاجراء
                  </h1>
                  <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-primary-600 font-arabic mt-1 sm:mt-2">
                    وكالة المسيلة الشباك الجواري برهوم
                  </h2>
                </div>
              </div>

              {/* Right side: Time Display - Clean and borderless */}
              <div className="text-right font-mono bg-primary-50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-soft">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary-700">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </div>
                <div className="text-sm sm:text-base lg:text-lg xl:text-xl text-primary-500 mt-1 sm:mt-2">
                  {currentTime.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area - Flex grows to fill remaining space */}
        <main className="flex-1 flex overflow-hidden p-2 sm:p-4 lg:p-6 gap-2 sm:gap-4 lg:gap-6 min-h-0">
          {/* Left side: Ticket Queue - Reduced width for better video visibility */}
          <div className="w-full sm:w-1/3 lg:w-1/4 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 flex flex-col">
            {/* Queue Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6 flex-shrink-0">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-700 font-arabic">قائمة الانتظار</h3>
              <span className="bg-primary-100 text-primary-700 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full text-sm sm:text-base lg:text-xl font-bold">
                {queueData.pending.length}
              </span>
            </div>

            {/* Dynamic Ticket Display - No scrolling, fits screen perfectly */}
            <div
              ref={queueContainerRef}
              className="flex-1 flex flex-col gap-2 sm:gap-3 overflow-hidden"
            >
              {visibleTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8 lg:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-lg sm:text-xl lg:text-2xl">📋</span>
                  </div>
                  <p className="text-sm sm:text-base lg:text-xl font-arabic text-primary-600">لا توجد تذاكر في الانتظار</p>
                </div>
              ) : (
                visibleTickets.map((ticket, index) => (
                  <div
                    key={`ticket-${ticket.id}-${index}`}
                    className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-lg flex-shrink-0 ${
                      index < 3
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 border-l-4 border-primary-400 shadow-md'
                        : 'bg-white border border-gray-200 hover:border-primary-200'
                    }`}
                    style={{
                      minHeight: window.innerWidth < 768 ? '70px' : window.innerWidth < 1024 ? '90px' : '110px',
                      maxHeight: window.innerWidth < 768 ? '90px' : window.innerWidth < 1024 ? '110px' : '140px',
                    }}
                  >
                    {/* Ticket Number and Service Name - Same Line Layout */}
                    <div className="flex items-center justify-start gap-2 sm:gap-3 mb-1">
                      <div className={`text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold ${
                        index < 3 ? 'text-primary-700' : 'text-primary-600'
                      }`}>
                        {ticket.ticket_number || 'N/A'}
                      </div>
                      <div className="text-sm sm:text-base lg:text-xl text-primary-400 font-light">
                        -
                      </div>
                      <div className="text-xs sm:text-sm lg:text-base xl:text-lg font-arabic text-primary-800 font-bold leading-tight flex-1">
                        {getServiceName(ticket.service_id)}
                      </div>
                    </div>

                    {/* Priority Indicator for top 3 tickets */}
                    {index < 3 && (
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm text-primary-600 font-medium">
                          {index === 0 ? 'التالي' : `المركز ${index + 1}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Overflow Indicator - Show when there are more tickets */}
              {queueData.pending.length > maxVisibleTickets && (
                <div className="flex items-center justify-center py-2 sm:py-3 bg-primary-50 rounded-lg border border-primary-200 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-primary-600 font-arabic text-xs sm:text-sm mb-1">
                      والمزيد من التذاكر في الانتظار
                    </div>
                    <div className="text-primary-700 font-bold text-sm sm:text-base lg:text-lg">
                      +{queueData.pending.length - maxVisibleTickets}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Video/Audio Display - Animation-based switching */}
          <div className="flex-1 bg-black rounded-xl sm:rounded-2xl shadow-lg overflow-hidden relative">
            {/* Video container - always present, controlled by opacity */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${videoPlayer.isVideoVisible ? 'opacity-100' : 'opacity-0'}`}>
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                muted
                playsInline
                loop
                onLoadedData={() => {
                  // Silent success handling
                }}
                onError={() => {
                  // Silent error handling
                }}
              />
              {!videoPlayer.isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900/90 to-primary-700/90 backdrop-blur-sm">
                  <div className="text-white text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 border-4 border-primary-300 border-t-transparent rounded-full animate-spin mx-auto mb-4 sm:mb-6"></div>
                    <p className="text-sm sm:text-base lg:text-xl font-arabic">جاري تحميل المحتوى...</p>
                  </div>
                </div>
              )}
              {videoPlayer.videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900/95 to-primary-700/95 backdrop-blur-sm">
                  <div className="text-white text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                      <span className="text-xl sm:text-2xl lg:text-4xl">🎬</span>
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-arabic mb-2">محتوى ترويجي</p>
                    <p className="text-sm sm:text-base lg:text-lg text-primary-200">سيتم عرض المحتوى قريباً</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio call overlay - appears when audio is playing */}
            {currentAudioCall && (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 text-white p-4 sm:p-6 lg:p-8 animate-fade-in">
                <div className="text-center space-y-4 sm:space-y-6 lg:space-y-8">
                  <div className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold drop-shadow-lg">{currentAudioCall.ticket_number}</div>
                  <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-arabic">{currentAudioCall.service_name}</div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-300 drop-shadow-lg">{currentAudioCall.window_label}</div>
                  <div className="text-sm sm:text-base lg:text-lg xl:text-2xl font-arabic opacity-90 max-w-4xl mx-auto leading-relaxed">
                    {currentAudioCall.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Control Dialog */}
        {showControlDialog && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleDialogBackdropClick}
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg mx-auto shadow-2xl">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-800 font-arabic">لوحة التحكم</h3>
                  <p className="text-sm sm:text-base lg:text-lg text-primary-600 mt-1 font-arabic">أدوات النظام والتحكم</p>
                </div>
                <button
                  onClick={() => setShowControlDialog(false)}
                  className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Control Buttons */}
              <div className="space-y-4">
                {/* Current Video Info */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-base sm:text-lg text-gray-800 font-arabic">الفيديو الحالي</div>
                      <div className="text-sm sm:text-base text-gray-600 mt-1 font-arabic">
                        {videoPlayer.currentVideoUrl ?
                          videoPlayer.currentVideoUrl.split('/').pop() || 'ads.mp4' :
                          'ads.mp4'
                        }
                      </div>
                    </div>
                    <div className="text-2xl">🎥</div>
                  </div>
                </div>

                {/* Change Video Button */}
                <button
                  onClick={handleVideoChange}
                  disabled={isChangingVideo}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 text-right disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-purple-800 font-arabic">
                        {isChangingVideo ? 'جاري تغيير الفيديو...' : 'تغيير فيديو الإعلانات'}
                      </div>
                      <div className="text-sm sm:text-base text-purple-600 mt-1 font-arabic">
                        {videoChangeStatus || 'اختر ملف فيديو جديد من الحاسوب'}
                      </div>
                    </div>
                    <div className="text-4xl ml-4">🎬</div>
                  </div>
                </button>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-blue-800 font-arabic">تحديث الصفحة</div>
                      <div className="text-sm sm:text-base text-blue-600 mt-1 font-arabic">إعادة تحميل النظام</div>
                    </div>
                    <div className="text-4xl ml-4">🔄</div>
                  </div>
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={handleFullscreen}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-green-800 font-arabic">
                        {isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
                      </div>
                      <div className="text-sm sm:text-base text-green-600 mt-1 font-arabic">
                        {isFullscreen ? 'العودة للحجم العادي' : 'عرض بملء الشاشة (F11)'}
                      </div>
                    </div>
                    <div className="text-4xl ml-4">{isFullscreen ? '🪟' : '⛶'}</div>
                  </div>
                </button>

                {/* Exit Button */}
                <button
                  onClick={handleExit}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-red-800 font-arabic">إغلاق النافذة</div>
                      <div className="text-sm sm:text-base text-red-600 mt-1 font-arabic">الخروج من النظام</div>
                    </div>
                    <div className="text-4xl ml-4">🚪</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConnectionGuard>
  );
};

export default DisplayScreen;
