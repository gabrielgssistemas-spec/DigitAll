import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StorageService } from './services/storage';
// ... seus outros imports normais ...
import { CooperadoRegister } from './views/CooperadoRegister';
import { BiometriaManager } from './views/BiometriaManager';
import { PontoMachine } from './views/PontoMachine';
import { Dashboard } from './views/Dashboard';
import { AuditLogViewer } from './views/AuditLogViewer';
import { HospitalRegister } from './views/HospitalRegister';
import { RelatorioProducao } from './views/RelatorioProducao';
import { Management } from './views/Management';
import { Login } from './views/Login';
import { EspelhoBiometria } from './views/EspelhoBiometria'; 
import { AutorizacaoPonto } from './views/AutorizacaoPonto';
import { HospitalPermissions } from './types';

// ---------------------------------------------------------------------------
// [MUDANÇA CRUCIAL] Importando os arquivos como URL estática via Vite
// Certifique-se de que os arquivos estão em 'src/libs/' agora!
// ---------------------------------------------------------------------------
//import es6ShimUrl from './libs/es6-shim.js?url';
//import webSdkUrl from './libs/websdk.client.bundle.min.js?url';
//import fingerprintUrl from './libs/fingerprint.sdk.min.js?url';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPermissions, setUserPermissions] = useState<HospitalPermissions | null>(null);
  
  useEffect(() => {
    const loadBiometriaScripts = async () => {
      // Agora usamos as URLs que o Vite gerou para nós.
      // Elas já virão corretas (ex: /assets/es6-shim.123.js)
      const scripts = [
        { name: 'Shim', url: es6ShimUrl },
        { name: 'WebSDK', url: webSdkUrl },
        { name: 'Fingerprint', url: fingerprintUrl }
      ];

      console.log('[Biometria] Iniciando carregamento via Imports Vite...');

      for (const scriptInfo of scripts) {
        // Verifica se já existe pelo src exato
        if (document.querySelector(`script[src="${scriptInfo.url}"]`)) {
          continue; 
        }

        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptInfo.url;
            script.async = false; 
            
            script.onload = () => {
              console.log(`[Biometria] ✅ Carregado: ${scriptInfo.name}`);
              resolve(true);
            };
            
            script.onerror = (e) => {
              console.error(`[Biometria] ❌ Erro em ${scriptInfo.name} (${scriptInfo.url})`, e);
              reject(e); 
            };
            
            document.body.appendChild(script);
          });
        } catch (error) {
          console.error(`Erro fatal carregando script: ${scriptInfo.name}`);
          // Não paramos o loop para tentar carregar os outros, se possível
        }
      }

      // Verificação final
      setTimeout(() => {
        // @ts-ignore
        if (window.Fingerprint) {
          console.log('🎉 SDK Biometria PRONTO e OPERACIONAL!');
        // @ts-ignore
        } else if (window.FingerprintSdk) {
           console.log('🎉 SDK Biometria (Modo Sdk) PRONTO!');
        } else {
           console.warn('⚠️ Scripts baixados, mas window.Fingerprint não detectado.');
        }
      }, 500); 
    };

    loadBiometriaScripts();
  }, []); 

  useEffect(() => {
    StorageService.init();
    const session = StorageService.getSession();
    if (session) {
      setIsAuthenticated(true);
      setUserPermissions(session.permissions);
      if (!session.permissions[currentView as keyof HospitalPermissions]) {
        const firstAllowed = Object.keys(session.permissions).find(k => session.permissions[k as keyof HospitalPermissions]);
        if (firstAllowed) setCurrentView(firstAllowed);
      }
    }
  }, []);

  const handleLoginSuccess = (permissions: HospitalPermissions) => {
    setIsAuthenticated(true);
    setUserPermissions(permissions);
    const firstAllowed = Object.keys(permissions).find(k => permissions[k as keyof HospitalPermissions]);
    if (firstAllowed) setCurrentView(firstAllowed);
    else setCurrentView('dashboard');
  };

  const handleLogout = () => {
    StorageService.clearSession();
    setUserPermissions(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard'); 
  };

  const handleChangeView = (view: string) => {
    if (userPermissions && userPermissions[view as keyof HospitalPermissions]) {
      setCurrentView(view);
    } else {
      alert("Acesso negado a este módulo.");
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    if (userPermissions && !userPermissions[currentView as keyof HospitalPermissions]) {
        return <div className="p-10 text-center text-gray-500">Acesso não autorizado.</div>;
    }
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'ponto': return <PontoMachine />;
      case 'relatorio': return <RelatorioProducao />;
      case 'espelho': return <EspelhoBiometria />; 
      case 'autorizacao': return <AutorizacaoPonto />;
      case 'cadastro': return <CooperadoRegister />;
      case 'hospitais': return <HospitalRegister />;
      case 'biometria': return <BiometriaManager />;
      case 'auditoria': return <AuditLogViewer />;
      case 'gestao': return <Management />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={handleChangeView} 
      onLogout={handleLogout}
      permissions={userPermissions || undefined}
      isKiosk={false} 
    >
      {renderView()}
    </Layout>
  );
}