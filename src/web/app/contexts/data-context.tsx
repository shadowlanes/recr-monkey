'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/auth/auth-provider';
import { supabase, TABLES } from '../lib/supabase';
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
      const { data: sourcesData, error: sourcesError } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .select('*')
        .eq('user_id', user.id)
        .order('name');
        
      if (sourcesError) throw sourcesError;
      setPaymentSources(sourcesData || []);
      
      // Load recurring payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('*')
        .eq('user_id', user.id)
        .order('name');
        
      if (paymentsError) throw paymentsError;
      setRecurringPayments(paymentsData || []);
      
    } catch (error: any) {
      console.error('Error loading data:', error.message);
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
      
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .update({
          name: updatedSource.name,
          type: updatedSource.type,
          identifier: updatedSource.identifier
        })
        .eq('id', updatedSource.id)
        .eq('user_id', user?.id)
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setPaymentSources(
          paymentSources.map(source => 
            source.id === updatedSource.id ? data[0] : source
          )
        );
      }
    } catch (error: any) {
      console.error('Error updating payment source:', error.message);
      setError('Failed to update payment source. Please try again.');
      throw error;
    }
  };

  // Add a new payment source
  const addPaymentSource = async (newSource: Omit<PaymentSource, 'id' | 'created_at'>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .insert([{
          ...newSource,
          user_id: user?.id
        }])
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setPaymentSources([...paymentSources, data[0]]);
      }
    } catch (error: any) {
      console.error('Error adding payment source:', error.message);
      setError('Failed to add payment source. Please try again.');
      throw error;
    }
  };

  // Delete a payment source
  const deletePaymentSource = async (sourceId: string) => {
    try {
      setError(null);
      
      // Check if payment source is used by any recurring payments
      const { data: associatedPayments, error: checkError } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('id, name')
        .eq('payment_source_id', sourceId);
        
      if (checkError) throw checkError;
      
      if (associatedPayments && associatedPayments.length > 0) {
        throw new Error(`This payment source is used by ${associatedPayments.length} recurring payment(s). Please update those payments first.`);
      }

      // Delete the payment source
      const { error } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .delete()
        .eq('id', sourceId)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setPaymentSources(
        paymentSources.filter(source => source.id !== sourceId)
      );
    } catch (error: any) {
      console.error('Error deleting payment source:', error.message);
      setError(error.message || 'Failed to delete payment source. Please try again.');
      throw error;
    }
  };

  // Update a recurring payment
  const updateRecurringPayment = async (paymentId: string, updatedPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .update({
          name: updatedPayment.name,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          frequency: updatedPayment.frequency,
          payment_source_id: updatedPayment.payment_source_id,
          start_date: updatedPayment.start_date,
          category: updatedPayment.category // Add category
        })
        .eq('id', paymentId)
        .eq('user_id', user?.id)
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setRecurringPayments(
          recurringPayments.map(payment => 
            payment.id === paymentId ? data[0] : payment
          )
        );
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error updating recurring payment:', error.message);
      setError('Failed to update recurring payment. Please try again.');
      throw error;
    }
  };

  // Add a new recurring payment
  const addRecurringPayment = async (newPayment: Omit<RecurringPayment, 'id' | 'user_id' | 'created_at'>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .insert([{
          ...newPayment,
          user_id: user?.id
        }])
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setRecurringPayments([...recurringPayments, data[0]]);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error adding recurring payment:', error.message);
      setError('Failed to add recurring payment. Please try again.');
      throw error;
    }
  };

  // Delete a recurring payment
  const deleteRecurringPayment = async (paymentId: string) => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .delete()
        .eq('id', paymentId)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setRecurringPayments(
        recurringPayments.filter(payment => payment.id !== paymentId)
      );
      return true;
    } catch (error: any) {
      console.error('Error deleting recurring payment:', error.message);
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