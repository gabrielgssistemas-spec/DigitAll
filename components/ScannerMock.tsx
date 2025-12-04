
import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, CheckCircle, AlertCircle, Scan, Usb, Monitor, Loader2, ExternalLink } from 'lucide-react';
import { biometryService } from '../services/biometry';
import { SampleFormat } from '../types';

interface ScannerMockProps {
  onScanSuccess: (hash: string) => void;
  onScanError?: (msg: string) => void;
  label?: string;
  isVerifying?: boolean;
}

export const ScannerMock: React.FC<ScannerMockProps> = ({ 
  onScanSuccess, 
  onScanError, 
  label = "Posicione o dedo no leitor",
  isVerifying = false
}) => {
  const [mode, setMode] = useState<'SIMULATOR' | 'DEVICE'>('SIMULATOR');
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [deviceMessage, setDeviceMessage] = useState<string>('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [fingerImage, setFingerImage] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  // 1. Detectar SDK Globalmente
  useEffect(() => {
    const checkSdk = setInterval(() => {
      if (biometryService.isSdkLoaded()) {
        clearInterval(checkSdk);
        if (isMounted.current) {
          setSdkLoaded(true);
          setMode('DEVICE'); // Auto-switch para Device se SDK detectado
        }
      }
    }, 1000);
    return () => { isMounted.current = false; clearInterval(checkSdk); };
  }, []);

  // 2. Inicialização do Leitor Físico
  useEffect(() => {
    if (mode === 'DEVICE') {
      if (sdkLoaded) {
        initializeRealDevice();
      } else {
        setDeviceMessage('Aguardando Drivers...');
      }
    } else {
      biometryService.stopAcquisition().catch(() => {});
      setDeviceMessage('');
      setStatus('IDLE');
      setFingerImage(null);
    }
    
    return () => {
      if (mode === 'DEVICE') biometryService.stopAcquisition().catch(() => {});
    };
  }, [mode, sdkLoaded]);

  const initializeRealDevice = async () => {
    try {
      setDeviceMessage('Buscando leitor...');
      setStatus('IDLE');
      
      biometryService.setListener({
        onDeviceConnected: () => setDeviceMessage('Leitor Conectado.'),
        onDeviceDisconnected: () => {
            setDeviceMessage('Leitor Desconectado.');
            setStatus('ERROR');
        },
        onSamplesAcquired: (s: any) => {
          setStatus('SUCCESS');
          setDeviceMessage('Leitura OK!');
          
          if (s.samples) {
            // Se for PNG (para feedback visual)
            if (typeof s.samples === 'string' && s.samples.startsWith('data:image')) {
                setFingerImage(s.samples);
            }
            
            // Gera um hash simulado baseado no tamanho da string da biometria para a demo
            // Em produção real, você usaria o Template (formato Intermediate) para comparação no servidor
            const simulatedHash = `BIO_HASH_${s.samples.length}_${Date.now()}`;
            
            setTimeout(() => {
              if (isMounted.current) {
                onScanSuccess(simulatedHash);
                setStatus('IDLE');
                setFingerImage(null); // Limpa imagem após sucesso
                setDeviceMessage('Pronto.');
              }
            }, 800);
          }
        },
        onErrorOccurred: (e: any) => {
          setStatus('ERROR');
          const msg = e.message || "Erro desconhecido no leitor";
          setDeviceMessage(msg);
          if (onScanError) onScanError(msg);
        }
      });

      // Inicia captura visual (PNG) para feedback do usuário
      await biometryService.startAcquisition(SampleFormat.PngImage);
      setDeviceMessage('Aguardando dedo...');

    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      if (err.message === "NO_DEVICE_FOUND") {
          setDeviceMessage("Nenhum leitor encontrado.");
      } else if (err.message === "SDK_NOT_LOADED") {
          setDeviceMessage("Driver não carregado.");
      } else {
          setDeviceMessage("Erro ao iniciar.");
      }
    }
  };

  // Lógica do Simulador
  const startScanSimulator = () => {
    if (status === 'SCANNING') return;
    setStatus('SCANNING');
    setProgress(0);
  };

  useEffect(() => {
    let interval: any;
    if (mode === 'SIMULATOR' && status === 'SCANNING') {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('SUCCESS');
            setTimeout(() => {
              if (isMounted.current) {
                onScanSuccess(`sim_hash_${Math.random().toString(36).substring(7)}`);
                setStatus('IDLE');
                setProgress(0);
              }
            }, 500);
            return 100;
          }
          return prev + 5; 
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [status, mode, onScanSuccess]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm mx-auto transition-all">
      
      {/* Botões de Modo */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-full">
        <button
          onClick={() => setMode('SIMULATOR')}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === 'SIMULATOR' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Monitor className="h-3 w-3 mr-1.5" />
          Simulador
        </button>
        <button
          onClick={() => setMode('DEVICE')}
          disabled={!sdkLoaded}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === 'DEVICE' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          {sdkLoaded ? <Usb className="h-3 w-3 mr-1.5" /> : <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
          Leitor USB
        </button>
      </div>

      {/* Interface Visual do Sensor */}
      <div 
        onClick={mode === 'SIMULATOR' ? startScanSimulator : undefined}
        className={`relative w-40 h-40 rounded-xl flex items-center justify-center border-2 transition-all duration-300 overflow-hidden ${
          status === 'IDLE' ? 'border-gray-200 bg-gray-50' :
          status === 'SCANNING' ? 'border-blue-400 bg-blue-50' :
          status === 'SUCCESS' ? 'border-green-500 bg-green-50' :
          'border-red-500 bg-red-50'
        } ${mode === 'SIMULATOR' ? 'cursor-pointer hover:border-primary-400' : ''}`}
      >
        {fingerImage ? (
            <img src={fingerImage} alt="Fingerprint" className="w-full h-full object-contain p-2 opacity-90" />
        ) : (
            <>
                {status === 'IDLE' && (
                  mode === 'DEVICE' ? (
                     <Fingerprint className="w-16 h-16 text-primary-400 animate-pulse" />
                  ) : (
                    <Scan className="w-16 h-16 text-gray-400" />
                  )
                )}
                {status === 'SCANNING' && <Fingerprint className="w-16 h-16 text-blue-500 animate-pulse" />}
                {status === 'SUCCESS' && <CheckCircle className="w-16 h-16 text-green-600" />}
                {status === 'ERROR' && <AlertCircle className="w-16 h-16 text-red-600" />}
            </>
        )}

        {mode === 'SIMULATOR' && status === 'SCANNING' && (
          <div 
            className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] opacity-80"
            style={{ 
              top: `${progress}%`,
              transition: 'top 0.05s linear' 
            }}
          />
        )}
      </div>

      {/* Mensagens de Status */}
      <div className="mt-4 text-center w-full">
        <h3 className="font-semibold text-gray-800 break-words px-2 text-sm min-h-[1.25rem]">
          {status === 'SCANNING' ? 'Lendo digital...' : 
           status === 'SUCCESS' ? 'Leitura OK!' : 
           mode === 'DEVICE' ? deviceMessage : 
           (isVerifying ? 'Clique para identificar' : 'Clique para simular')}
        </h3>
        
        {mode === 'DEVICE' && (status === 'ERROR' || !sdkLoaded) && (
          <div className="mt-3 w-full space-y-2">
            {!sdkLoaded && (
               <p className="text-[10px] text-red-500 bg-red-50 p-1 rounded border border-red-100">
                 Drivers não detectados.
               </p>
            )}
            <a 
              href="https://127.0.0.1:52181/get_connection" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full px-3 py-2 bg-gray-50 text-gray-700 text-xs font-bold rounded border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Testar Conexão Local
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
