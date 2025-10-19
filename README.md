# Decentralized Science License Market

The DecSci License Market is an innovative peer-to-peer platform that transforms the way researchers share and monetize their encrypted datasets. By leveraging **Zama's Fully Homomorphic Encryption technology**, this platform enables researchers to issue time-limited "computation licenses" for their FHE-encrypted datasets in the form of NFTs, facilitating private and secure transactions via privacy payments. 

## Addressing the Data Sharing Dilemma

In the realm of research, data is often siloed due to privacy concerns and legal restrictions, hindering collaboration and innovation. Researchers struggle to share vital datasets without compromising sensitive information. Additionally, traditional data licensing methods can lack flexibility and transparency, leading to mistrust and inefficiencies in the academic community.

## How FHE Transforms Data Licensing

Zama's Fully Homomorphic Encryption (FHE) provides a revolutionary solution to these challenges. By allowing computations to be performed directly on encrypted data, FHE enables secure data sharing without exposing the underlying information. Implemented using Zama's robust open-source libraries such as **Concrete** and **TFHE-rs**, the DecSci License Market ensures that research data remains confidential while being processed. This promotes a more dynamic, trustworthy, and efficient data-sharing ecosystem for researchers.

## Core Functionalities of the DecSci License Market

- **Datasets and Computation Licensing via NFTs:** Researchers can tokenize their datasets and issue computation licenses as NFTs, making it easy to track ownership and usage rights.
- **Secure License Execution and Verification:** The platform utilizes homomorphic encryption to execute and validate licenses without revealing the data itself.
- **Royalty Settlements through Privacy Payments:** All transactions are conducted through secure payment methods, ensuring researchers receive fair compensation without compromising their privacy.
- **Flexible Market Dynamics:** The platform supports a wide range of datasets and licenses, adapting to the unique needs of different researchers and institutions.

## Technology Stack

The DecSci License Market is built upon a solid technological foundation, including:

- **Zama's FHE Libraries:** 
  - **Concrete** – For efficient computation on encrypted data.
  - **TFHE-rs** – For fast bootstrapping of encrypted operations.
- **Node.js** – For backend development.
- **Hardhat/Foundry** – For smart contract development and deployment.
- **Solidity** – For writing smart contracts.

## Directory Structure

Here’s an overview of the project structure:

```
DecSci_License_Market/
├── contracts/
│   └── DeSci_License_Market.sol
├── scripts/
│   ├── deploy.js
│   └── interact.js
├── src/
│   ├── app.js
│   └── utils.js
├── test/
│   ├── test_deployment.js
│   └── test_functions.js
├── .env
├── package.json
└── README.md
```

## Installation Instructions

To set up the DecSci License Market:

1. Make sure you have **Node.js** installed (version 14.x or higher).
2. Install Hardhat or Foundry as your development framework.
3. Change into the project directory.
4. Run `npm install` to fetch the required Zama FHE libraries along with other dependencies.

**Important:** Do not use `git clone` or any URLs to set up the project. Follow the steps carefully to ensure a smooth installation.

## Build & Run the Project

Once you've completed the installation, you're ready to build and run the DecSci License Market:

1. **Compile the Smart Contracts:**
   ```bash
   npx hardhat compile
   ```

2. **Deploy the Contracts to Your Development Network:**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Run Tests to Ensure Everything Works Properly:**
   ```bash
   npx hardhat test
   ```

4. **Start the Application:**
   ```bash
   node src/app.js
   ```

Here’s a code snippet illustrating how to create a computation license NFT:

```javascript
const { ethers } = require("hardhat");

async function main() {
    const DeSciLicenseMarket = await ethers.getContractFactory("DeSci_License_Market");
    const licenseMarket = await DeSciLicenseMarket.deploy();
    await licenseMarket.deployed();

    const tokenId = await licenseMarket.createLicenseNFT("dataset-encrypted", 30);
    console.log(`Created NFT with Token ID: ${tokenId}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

## Acknowledgements

### Powered by Zama

We extend our heartfelt gratitude to the Zama team for their pioneering work in the field of Fully Homomorphic Encryption. Their open-source tools and commitment to advancing confidential computing have been instrumental in making the DecSci License Market a reality, fostering a more secure and equitable environment for scientific collaboration. 

Together, we are paving the way for a future where researchers can share knowledge while safeguarding their innovations.
