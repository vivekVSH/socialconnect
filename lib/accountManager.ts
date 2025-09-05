'use client';

interface Account {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  last_login: string;
}

class AccountManager {
  private static instance: AccountManager;
  private accounts: Account[] = [];
  private currentAccountId: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AccountManager {
    if (!AccountManager.instance) {
      AccountManager.instance = new AccountManager();
    }
    return AccountManager.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('socialconnect_accounts');
      if (stored) {
        this.accounts = JSON.parse(stored);
      }
      
      const current = localStorage.getItem('socialconnect_current_account');
      if (current) {
        this.currentAccountId = current;
      }
    } catch (error) {
      console.error('Error loading accounts from storage:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('socialconnect_accounts', JSON.stringify(this.accounts));
      if (this.currentAccountId) {
        localStorage.setItem('socialconnect_current_account', this.currentAccountId);
      }
    } catch (error) {
      console.error('Error saving accounts to storage:', error);
    }
  }

  addAccount(account: Account) {
    // Check if account already exists
    const existingIndex = this.accounts.findIndex(acc => acc.id === account.id);
    
    if (existingIndex >= 0) {
      // Update existing account
      this.accounts[existingIndex] = { ...account, last_login: new Date().toISOString() };
    } else {
      // Add new account
      this.accounts.push({ ...account, last_login: new Date().toISOString() });
    }
    
    this.currentAccountId = account.id;
    this.saveToStorage();
  }

  getAccounts(): Account[] {
    return [...this.accounts];
  }

  getCurrentAccount(): Account | null {
    if (!this.currentAccountId) return null;
    return this.accounts.find(acc => acc.id === this.currentAccountId) || null;
  }

  switchToAccount(accountId: string): boolean {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (account) {
      this.currentAccountId = accountId;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getAccountToSwitchTo(accountId: string): Account | null {
    return this.accounts.find(acc => acc.id === accountId) || null;
  }

  removeAccount(accountId: string): boolean {
    const index = this.accounts.findIndex(acc => acc.id === accountId);
    if (index >= 0) {
      this.accounts.splice(index, 1);
      
      // If we removed the current account, switch to another one
      if (this.currentAccountId === accountId) {
        this.currentAccountId = this.accounts.length > 0 ? this.accounts[0].id : null;
      }
      
      this.saveToStorage();
      return true;
    }
    return false;
  }

  clearAllAccounts() {
    this.accounts = [];
    this.currentAccountId = null;
    this.saveToStorage();
  }

  hasMultipleAccounts(): boolean {
    return this.accounts.length > 1;
  }
}

export default AccountManager;
