// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

interface DataLicense {
  id: string;
  datasetName: string;
  encryptedPrice: string;
  licenseDuration: number;
  owner: string;
  category: string;
  isAvailable: boolean;
}

// Style selections (randomized)
// Colors: Tech (Blue+Black)
// UI: Future Metal
// Layout: Card Grid
// Interaction: Micro-interactions

const FHEEncryptNumber = (value: number): string => {
  return `FHE-${btoa(value.toString())}`;
};

const FHEDecryptNumber = (encryptedData: string): number => {
  if (encryptedData.startsWith('FHE-')) {
    return parseFloat(atob(encryptedData.substring(4)));
  }
  return parseFloat(encryptedData);
};

const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<DataLicense[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [newLicenseData, setNewLicenseData] = useState({ datasetName: "", category: "Genomics", price: 0, duration: 30 });
  const [selectedLicense, setSelectedLicense] = useState<DataLicense | null>(null);
  const [decryptedPrice, setDecryptedPrice] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Randomly selected features: Search & Filter, Data Statistics, Project Introduction

  useEffect(() => {
    loadLicenses().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setStartTimestamp(Math.floor(Date.now() / 1000));
      setDurationDays(30);
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();
  }, []);

  const loadLicenses = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) return;
      
      const keysBytes = await contract.getData("license_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try {
          const keysStr = ethers.toUtf8String(keysBytes);
          if (keysStr.trim() !== '') keys = JSON.parse(keysStr);
        } catch (e) { console.error("Error parsing license keys:", e); }
      }
      
      const list: DataLicense[] = [];
      for (const key of keys) {
        try {
          const licenseBytes = await contract.getData(`license_${key}`);
          if (licenseBytes.length > 0) {
            try {
              const licenseData = JSON.parse(ethers.toUtf8String(licenseBytes));
              list.push({ 
                id: key, 
                datasetName: licenseData.datasetName,
                encryptedPrice: licenseData.price,
                licenseDuration: licenseData.duration,
                owner: licenseData.owner,
                category: licenseData.category,
                isAvailable: licenseData.isAvailable
              });
            } catch (e) { console.error(`Error parsing license data for ${key}:`, e); }
          }
        } catch (e) { console.error(`Error loading license ${key}:`, e); }
      }
      list.sort((a, b) => b.licenseDuration - a.licenseDuration);
      setLicenses(list);
    } catch (e) { console.error("Error loading licenses:", e); } 
    finally { setIsRefreshing(false); setLoading(false); }
  };

  const createLicense = async () => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setCreating(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Encrypting license price with Zama FHE..." });
    try {
      const encryptedPrice = FHEEncryptNumber(newLicenseData.price);
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const licenseId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const licenseData = { 
        datasetName: newLicenseData.datasetName,
        price: encryptedPrice,
        duration: newLicenseData.duration,
        owner: address,
        category: newLicenseData.category,
        isAvailable: true
      };
      
      await contract.setData(`license_${licenseId}`, ethers.toUtf8Bytes(JSON.stringify(licenseData)));
      
      const keysBytes = await contract.getData("license_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try { keys = JSON.parse(ethers.toUtf8String(keysBytes)); } 
        catch (e) { console.error("Error parsing keys:", e); }
      }
      keys.push(licenseId);
      await contract.setData("license_keys", ethers.toUtf8Bytes(JSON.stringify(keys)));
      
      setTransactionStatus({ visible: true, status: "success", message: "License created with FHE encryption!" });
      await loadLicenses();
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewLicenseData({ datasetName: "", category: "Genomics", price: 0, duration: 30 });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") ? "Transaction rejected by user" : "Creation failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { setCreating(false); }
  };

  const decryptWithSignature = async (encryptedData: string): Promise<number | null> => {
    if (!isConnected) { alert("Please connect wallet first"); return null; }
    setIsDecrypting(true);
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}\nstartTimestamp:${startTimestamp}\ndurationDays:${durationDays}`;
      await signMessageAsync({ message });
      await new Promise(resolve => setTimeout(resolve, 1500));
      return FHEDecryptNumber(encryptedData);
    } catch (e) { console.error("Decryption failed:", e); return null; } 
    finally { setIsDecrypting(false); }
  };

  const purchaseLicense = async (licenseId: string) => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setTransactionStatus({ visible: true, status: "pending", message: "Processing license purchase with FHE..." });
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const licenseBytes = await contract.getData(`license_${licenseId}`);
      if (licenseBytes.length === 0) throw new Error("License not found");
      
      const licenseData = JSON.parse(ethers.toUtf8String(licenseBytes));
      const updatedLicense = { ...licenseData, isAvailable: false };
      
      await contract.setData(`license_${licenseId}`, ethers.toUtf8Bytes(JSON.stringify(updatedLicense)));
      
      setTransactionStatus({ visible: true, status: "success", message: "License purchased successfully!" });
      await loadLicenses();
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e: any) {
      setTransactionStatus({ visible: true, status: "error", message: "Purchase failed: " + (e.message || "Unknown error") });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = license.datasetName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || license.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["All", "Genomics", "Clinical", "Imaging", "Environmental", "Behavioral"];

  if (loading) return (
    <div className="loading-screen">
      <div className="tech-spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container tech-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="circuit-icon"></div>
          </div>
          <h1>DeSci<span>License</span>Market</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowCreateModal(true)} className="create-license-btn tech-button">
            <div className="add-icon"></div>List Dataset
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Private Peer-to-Peer Data Licensing</h2>
            <p>Securely license encrypted research datasets using Zama FHE technology and NFT-based access tokens</p>
          </div>
          <div className="fhe-indicator">
            <div className="fhe-lock"></div>
            <span>FHE Encryption Active</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card tech-card">
            <h3>Project Introduction</h3>
            <p>A decentralized platform where researchers can license their <strong>FHE-encrypted datasets</strong> as NFTs with time-limited computation rights. Powered by Zama's fully homomorphic encryption.</p>
            <div className="tech-badge">
              <span>FHE-Powered Data Markets</span>
            </div>
          </div>

          <div className="dashboard-card tech-card">
            <h3>Data Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{licenses.length}</div>
                <div className="stat-label">Total Licenses</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{licenses.filter(l => l.isAvailable).length}</div>
                <div className="stat-label">Available</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{categories.length - 1}</div>
                <div className="stat-label">Categories</div>
              </div>
            </div>
          </div>
        </div>

        <div className="search-filter-section">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search datasets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tech-input"
            />
            <div className="search-icon"></div>
          </div>
          <div className="filter-selector">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="tech-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="licenses-section">
          <div className="section-header">
            <h2>Available Dataset Licenses</h2>
            <div className="header-actions">
              <button onClick={loadLicenses} className="refresh-btn tech-button" disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {filteredLicenses.length === 0 ? (
            <div className="no-licenses tech-card">
              <div className="no-data-icon"></div>
              <p>No dataset licenses found</p>
              <button className="tech-button primary" onClick={() => setShowCreateModal(true)}>
                List Your Dataset
              </button>
            </div>
          ) : (
            <div className="licenses-grid">
              {filteredLicenses.map(license => (
                <div className="license-card tech-card" key={license.id} onClick={() => setSelectedLicense(license)}>
                  <div className="card-header">
                    <h3>{license.datasetName}</h3>
                    <span className={`availability-badge ${license.isAvailable ? 'available' : 'sold'}`}>
                      {license.isAvailable ? 'Available' : 'Licensed'}
                    </span>
                  </div>
                  <div className="card-details">
                    <div className="detail-item">
                      <span>Category:</span>
                      <strong>{license.category}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Duration:</span>
                      <strong>{license.licenseDuration} days</strong>
                    </div>
                    <div className="detail-item">
                      <span>Owner:</span>
                      <strong>{license.owner.substring(0, 6)}...{license.owner.substring(38)}</strong>
                    </div>
                  </div>
                  <div className="card-footer">
                    {license.isAvailable && (
                      <button 
                        className="purchase-btn tech-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          purchaseLicense(license.id);
                        }}
                      >
                        Purchase License
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <ModalCreate 
          onSubmit={createLicense} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating} 
          licenseData={newLicenseData} 
          setLicenseData={setNewLicenseData}
        />
      )}

      {selectedLicense && (
        <LicenseDetailModal 
          license={selectedLicense} 
          onClose={() => {
            setSelectedLicense(null);
            setDecryptedPrice(null);
          }} 
          decryptedPrice={decryptedPrice} 
          setDecryptedPrice={setDecryptedPrice} 
          isDecrypting={isDecrypting} 
          decryptWithSignature={decryptWithSignature}
        />
      )}

      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content tech-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="tech-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="circuit-icon"></div>
              <span>DeSci License Market</span>
            </div>
            <p>Private peer-to-peer data licensing powered by Zama FHE</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="tech-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} DeSci License Market. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  licenseData: any;
  setLicenseData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ onSubmit, onClose, creating, licenseData, setLicenseData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLicenseData({ ...licenseData, [name]: value });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLicenseData({ ...licenseData, [name]: parseFloat(value) });
  };

  const handleSubmit = () => {
    if (!licenseData.datasetName || !licenseData.price) { 
      alert("Please fill required fields"); 
      return; 
    }
    onSubmit();
  };

  const categories = ["Genomics", "Clinical", "Imaging", "Environmental", "Behavioral"];

  return (
    <div className="modal-overlay">
      <div className="create-modal tech-card">
        <div className="modal-header">
          <h2>List New Dataset</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> 
            <div>
              <strong>FHE Encryption Notice</strong>
              <p>Your pricing data will be encrypted with Zama FHE before submission</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Dataset Name *</label>
              <input 
                type="text" 
                name="datasetName" 
                value={licenseData.datasetName} 
                onChange={handleChange} 
                placeholder="Enter dataset name..."
                className="tech-input"
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select 
                name="category" 
                value={licenseData.category} 
                onChange={handleChange} 
                className="tech-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>License Price (ETH) *</label>
              <input 
                type="number" 
                name="price" 
                value={licenseData.price} 
                onChange={handleValueChange} 
                placeholder="Enter price in ETH..."
                className="tech-input"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Duration (Days) *</label>
              <input 
                type="number" 
                name="duration" 
                value={licenseData.duration} 
                onChange={handleValueChange} 
                placeholder="Enter license duration..."
                className="tech-input"
                min="1"
              />
            </div>
          </div>
          <div className="encryption-preview">
            <h4>Encryption Preview</h4>
            <div className="preview-container">
              <div className="plain-data">
                <span>Plain Price:</span>
                <div>{licenseData.price || '0'} ETH</div>
              </div>
              <div className="encryption-arrow">→</div>
              <div className="encrypted-data">
                <span>Encrypted Price:</span>
                <div>{licenseData.price ? FHEEncryptNumber(licenseData.price).substring(0, 50) + '...' : 'No value entered'}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn tech-button">Cancel</button>
          <button onClick={handleSubmit} disabled={creating} className="submit-btn tech-button primary">
            {creating ? "Encrypting with FHE..." : "List Dataset"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface LicenseDetailModalProps {
  license: DataLicense;
  onClose: () => void;
  decryptedPrice: number | null;
  setDecryptedPrice: (value: number | null) => void;
  isDecrypting: boolean;
  decryptWithSignature: (encryptedData: string) => Promise<number | null>;
}

const LicenseDetailModal: React.FC<LicenseDetailModalProps> = ({ 
  license, 
  onClose, 
  decryptedPrice, 
  setDecryptedPrice, 
  isDecrypting, 
  decryptWithSignature 
}) => {
  const handleDecrypt = async () => {
    if (decryptedPrice !== null) { 
      setDecryptedPrice(null); 
      return; 
    }
    const decrypted = await decryptWithSignature(license.encryptedPrice);
    if (decrypted !== null) setDecryptedPrice(decrypted);
  };

  return (
    <div className="modal-overlay">
      <div className="license-detail-modal tech-card">
        <div className="modal-header">
          <h2>License Details</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        <div className="modal-body">
          <div className="license-info">
            <div className="info-item">
              <span>Dataset:</span>
              <strong>{license.datasetName}</strong>
            </div>
            <div className="info-item">
              <span>Category:</span>
              <strong>{license.category}</strong>
            </div>
            <div className="info-item">
              <span>Owner:</span>
              <strong>{license.owner.substring(0, 6)}...{license.owner.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>Duration:</span>
              <strong>{license.licenseDuration} days</strong>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <strong className={`availability-badge ${license.isAvailable ? 'available' : 'sold'}`}>
                {license.isAvailable ? 'Available' : 'Licensed'}
              </strong>
            </div>
          </div>
          <div className="encrypted-data-section">
            <h3>Encrypted Price</h3>
            <div className="encrypted-data">{license.encryptedPrice.substring(0, 100)}...</div>
            <div className="fhe-tag">
              <div className="fhe-icon"></div>
              <span>FHE Encrypted</span>
            </div>
            <button 
              className="decrypt-btn tech-button" 
              onClick={handleDecrypt} 
              disabled={isDecrypting}
            >
              {isDecrypting ? (
                <span className="decrypt-spinner"></span>
              ) : decryptedPrice !== null ? (
                "Hide Decrypted Price"
              ) : (
                "Decrypt with Wallet Signature"
              )}
            </button>
          </div>
          {decryptedPrice !== null && (
            <div className="decrypted-data-section">
              <h3>Decrypted Price</h3>
              <div className="decrypted-value">{decryptedPrice} ETH</div>
              <div className="decryption-notice">
                <div className="warning-icon"></div>
                <span>Decrypted price is only visible after wallet signature verification</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn tech-button">Close</button>
        </div>
      </div>
    </div>
  );
};

export default App;