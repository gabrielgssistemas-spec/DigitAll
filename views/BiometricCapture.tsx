
import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, Loader, Fingerprint } from 'lucide-react';
import { biometryService } from '../services/biometry';
import { SampleFormat } from '../types';

export const BiometricCapture: React.FC = () => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [rawHash, setRawHash] = useState<string>('');
  const [quality, setQuality] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sdkConnected, setSdkConnected] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<SampleFormat>(SampleFormat.PngImage);

  useEffect(() => {
    // Check for SDK load
    const checkTimer = setInterval(() => {
        if (biometryService.isSdkLoaded()) {
            setSdkConnected(true);
            loadDevices();
            clearInterval(checkTimer);
            setIsLoading(false);
        }
    }, 500);
    
    // Fallback timeout
    setTimeout(() => {
        clearInterval(checkTimer);
        if (!biometryService.isSdkLoaded()) {
            setError("SDK não carregado. Verifique a instalação do driver.");
            setIsLoading(false);
        }
    }, 5000);

    return () => clearInterval(checkTimer);
  }, []);

  useEffect(() => {
      // Listener Cleanup on Unmount
      return () => {
          biometryService.stopAcquisition().catch(() => {});
      }
  }, []);

  const loadDevices = async () => {
      try {
          const devs = await biometryService.enumerateDevices();
          setDevices(devs);
          if (devs.length > 0) {
              setSelectedDevice(devs[0]);
              setMessage(`Leitor detectado: ${devs[0]}`);
          } else {
              setMessage("Nenhum leitor encontrado.");
          }
      } catch (e) {
          setError("Erro ao listar dispositivos.");
      }
  };

  const handleStartCapture = async () => {
      setError('');
      setCapturedImage('');
      setRawHash('');
      setMessage("Iniciando...");
      
      try {
          // Setup listeners before starting
          biometryService.setListener({
              onDeviceConnected: () => setMessage("Leitor conectado"),
              onDeviceDisconnected: () => { setMessage("Leitor desconectado"); setIsCapturing(false); },
              onQualityReported: (e: any) => setQuality(`Qualidade: ${e.quality}`),
              onSamplesAcquired: (s: any) => {
                  setMessage("Amostra adquirida!");
                  if (s.samples) {
                      if (currentFormat === SampleFormat.PngImage) {
                          setCapturedImage(s.samples);
                      } else {
                          setRawHash(s.samples.substring(0, 50) + "...");
                      }
                  }
              },
              onErrorOccurred: (e: any) => {
                  setError(e.message || "Erro no leitor");
                  setIsCapturing(false);
              }
          });

          await biometryService.startAcquisition(currentFormat, selectedDevice);
          setIsCapturing(true);
          setMessage("Coloque o dedo no sensor.");
      } catch (e: any) {
          setError(e.message || "Erro ao iniciar captura.");
          setIsCapturing(false);
      }
  };

  const handleStopCapture = async () => {
      await biometryService.stopAcquisition();
      setIsCapturing(false);
      setMessage("Captura parada.");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Diagnóstico de Biometria</h2>
            <p className="text-gray-500 text-sm">Teste de conexão e qualidade do leitor</p>
        </div>
        <div className="flex items-center gap-2">
          {sdkConnected ? (
            <span className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <Wifi className="h-4 w-4 mr-2" /> SDK Ativo
            </span>
          ) : (
            <span className="flex items-center text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                <WifiOff className="h-4 w-4 mr-2" /> SDK Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Dispositivo</label>
                  <select 
                    className="w-full border border-gray-300 rounded p-2"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    disabled={isCapturing}
                  >
                      {devices.length === 0 && <option>Nenhum dispositivo</option>}
                      {devices.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Formato</label>
                  <select 
                    className="w-full border border-gray-300 rounded p-2"
                    value={currentFormat}
                    onChange={(e) => setCurrentFormat(Number(e.target.value))}
                    disabled={isCapturing}
                  >
                      <option value={SampleFormat.PngImage}>Imagem (PNG)</option>
                      <option value={SampleFormat.Intermediate}>Template (Hash)</option>
                      <option value={SampleFormat.Raw}>Raw</option>
                  </select>
              </div>

              <div className="flex gap-4">
                  <button 
                    onClick={handleStartCapture} 
                    disabled={!sdkConnected || isCapturing || devices.length === 0}
                    className="flex-1 bg-primary-600 text-white font-bold py-3 rounded hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
                  >
                      {isCapturing ? 'Capturando...' : 'Iniciar'}
                  </button>
                  <button 
                    onClick={handleStopCapture} 
                    disabled={!isCapturing}
                    className="flex-1 border border-red-300 text-red-600 font-bold py-3 rounded hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                  >
                      Parar
                  </button>
              </div>

              {message && <div className="p-3 bg-gray-100 rounded text-sm text-gray-700 border border-gray-200">{message}</div>}
              {error && <div className="p-3 bg-red-50 rounded text-sm text-red-600 border border-red-200 flex items-center"><AlertCircle className="h-4 w-4 mr-2"/>{error}</div>}
          </div>

          {/* Visualization */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 min-h-[300px]">
              {capturedImage ? (
                  <img src={capturedImage} alt="Fingerprint" className="max-w-full max-h-64 object-contain shadow-sm border bg-white" />
              ) : rawHash ? (
                  <div className="text-xs font-mono break-all bg-white p-4 rounded border w-full h-full overflow-auto">
                      <strong>Dados Recebidos (Hash/Raw):</strong>
                      <br/><br/>
                      {rawHash}
                  </div>
              ) : (
                  <div className="text-center text-gray-400">
                      <Fingerprint className={`h-16 w-16 mx-auto mb-2 ${isCapturing ? 'animate-pulse text-primary-300' : ''}`} />
                      <p>Visualização da Amostra</p>
                  </div>
              )}
              {quality && <div className="mt-4 text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded shadow-sm">{quality}</div>}
          </div>
      </div>
    </div>
  );
};
