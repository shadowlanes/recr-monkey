'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/auth/auth-provider';
import { api } from '../lib/api-client';
import { RecurringPayment, PaymentSource } from '../types';

interface DataContextType {
  recurringPayments: RecurringPayment[];
  paymentSources: PaymentSource[];
  isLoading: boolean;
  error: string | null;
  updatePaymentSource: (updatedSource: PaymentSource) => Promise<void>;
  addPaymentSource: (newSource: Omit<PaymentSource, 'id' | 'created_at'>) => Promise<void>;
  deletePaymentSource: (sourceId: string) => Promise<void>;
  updateRecurringPayment: (paymentId: string, updatedPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => Promise<boolean>;
  addRecurringPayment: (newPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => Promise<boolean>;
  deleteRecurringPayment: (paymentId: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all data initially and when user changes
  const loadAllData = useCallback(async () => {
    if (!user) {
      setRecurringPayments([]);
      setPaymentSources([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Load payment sources
      const sourcesData = await api.getPaymentSources();
      setPaymentSources(sourcesData || []);
      
      // Load recurring payments
      const paymentsData = await api.getRecurringPayments();
      setRecurringPayments(paymentsData || []);
      
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, [user, loadAllData]);

  // Update a payment source
  const updatePaymentSource = async (updatedSource: PaymentSource) => {
    try {
      setError(null);
      
      const data = await api.updatePaymentSource(updatedSource.id, {
        name: updatedSource.name,
        type: updatedSource.type,
        identifier: updatedSource.identifier
      });
      
      if (data) {
        setPaymentSources(
          paymentSources.map(source => 
            source.id === updatedSource.id ? data : source
          )
        );
      }
    } catch (error: unknown) {
      console.error('Error updating payment source:', error);
      setError('Failed to update payment source. Please try again.');
      throw error;
    }
  };

  // Add a new payment source
  const addPaymentSource = async (newSource: Omit<PaymentSource, 'id' | 'created_at'>) => {
    try {
      setError(null);
      
      const data = await api.createPaymentSource({
        name: newSource.name,
        type: newSource.type,
        identifier: newSource.identifier
      });
      
      if (data) {
        setPaymentSources([...paymentSources, data]);
      }
    } catch (error: unknown) {
      console.error('Error adding payment source:', error);
      setError('Failed to add payment source. Please try again.');
      throw error;
    }
  };

  // Delete a payment source
  const deletePaymentSource = async (sourceId: string) => {
    try {
      setError(null);
      
      await api.deletePaymentSource(sourceId);
      
      setPaymentSources(
        paymentSources.filter(source => source.id !== sourceId)
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete payment source. Please try again.';
      console.error('Error deleting payment source:', error);
      setError(errorMessage);
      throw error;
    }
  };

  // Update a recurring payment
  const updateRecurringPayment = async (paymentId: string, updatedPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => {
    try {
      setError(null);
      
      const data = await api.updateRecurringPayment(paymentId, {
        name: updatedPayment.name,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        frequency: updatedPayment.frequency,
        payment_source_id: updatedPayment.payment_source_id,
        start_date: updatedPayment.start_date,
        category: updatedPayment.category
      });
      
      if (data) {
        setRecurringPayments(
          recurringPayments.map(payment => 
            payment.id === paymentId ? data : payment
          )
        );
        return true;
      }
      return false;
    } catch (error: unknown) {
      console.error('Error updating recurring payment:', error);
      setError('Failed to update recurring payment. Please try again.');
      throw error;
    }
  };

  // Add a new recurring payment
  const addRecurringPayment = async (newPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => {
    try {
      setError(null);
      
      const data = await api.createRecurringPayment({
        name: newPayment.name,
        amount: newPayment.amount,
        currency: newPayment.currency,
        frequency: newPayment.frequency,
        payment_source_id: newPayment.payment_source_id,
        start_date: newPayment.start_date,
        category: newPayment.category
      });
      
      if (data) {
        setRecurringPayments([...recurringPayments, data]);
        return true;
      }
      return false;
    } catch (error: unknown) {
      console.error('Error adding recurring payment:', error);
      setError('Failed to add recurring payment. Please try again.');
      throw error;
    }
  };

  // Delete a recurring payment
  const deleteRecurringPayment = async (paymentId: string) => {
    try {
      setError(null);
      
      await api.deleteRecurringPayment(paymentId);
      
      setRecurringPayments(
        recurringPayments.filter(payment => payment.id !== paymentId)
      );
      return true;
    } catch (error: unknown) {
      console.error('Error deleting recurring payment:', error);
      setError('Failed to delete recurring payment. Please try again.');
      throw error;
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await loadAllData();
  };

  return (
    <DataContext.Provider
      value={{
        recurringPayments,
        paymentSources,
        isLoading,
        error,
        updatePaymentSource,
        addPaymentSource,
        deletePaymentSource,
        updateRecurringPayment,
        addRecurringPayment,
        deleteRecurringPayment,
        refreshData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}