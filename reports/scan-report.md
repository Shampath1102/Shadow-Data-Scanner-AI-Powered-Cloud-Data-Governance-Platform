# 🔒 Shadow Data Scanner Report

**Scan Time:** 118ms

## 📊 Summary

- **Files Scanned:** 4
- **Total Findings:** 14
- **Files with Issues:** 1

### Risk Breakdown

- 🔴 High: 8
- 🟡 Medium: 6
- 🟢 Low: 0

### Category Breakdown

- **credentials:** 5
- **financial:** 4
- **tokens:** 1
- **generic:** 4

## 💡 Recommendations

### HIGH
- **Issue:** Remove 8 hardcoded credentials found in your files
- **Action:** Move secrets to environment variables or a secret manager

### HIGH
- **Issue:** Credentials detected in plain text
- **Action:** Use a secrets manager like HashiCorp Vault or AWS Secrets Manager

### HIGH
- **Issue:** Financial data (credit cards, IBANs) detected
- **Action:** Encrypt financial data and restrict access

