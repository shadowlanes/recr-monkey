'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { supabase, TABLES, PAYMENT_FREQUENCIES } from '../../lib/supabase';
import { RecurringPayment, PaymentSource } from '../../types';

export default function RecurringPayments() {
  const { user } = useAuth();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentPayment, setCurrentPayment] = useState<RecurringPayment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    frequency: PAYMENT_FREQUENCIES.MONTHLY,
    payment_source_id: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load payment sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
        
      if (sourcesError) throw sourcesError;
      setPaymentSources(sourcesData || []);
      
      // Load recurring payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
        
      if (paymentsError) throw paymentsError;
      setRecurringPayments(paymentsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error.message);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    // Check if payment sources exist first
    if (paymentSources.length === 0) {
      setError('You need to add at least one payment source before adding a recurring payment.');
      return;
    }
    
    setFormData({
      name: '',
      amount: '',
      currency: 'USD',
      frequency: PAYMENT_FREQUENCIES.MONTHLY,
      payment_source_id: paymentSources[0]?.id || '',
      start_date: new Date().toISOString().split('T')[0]
    });
    setModalMode('add');
    setCurrentPayment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (payment: RecurringPayment) => {
    setFormData({
      name: payment.name,
      amount: payment.amount.toString(),
      currency: payment.currency,
      frequency: payment.frequency,
      payment_source_id: payment.payment_source_id,
      start_date: payment.start_date
    });
    setModalMode('edit');
    setCurrentPayment(payment);
    setIsModalOpen(true);
  };

  const handleDelete = (payment: RecurringPayment) => {
    setCurrentPayment(payment);
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate the amount is a positive number
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      if (modalMode === 'add') {
        // Add new recurring payment
        const { data, error } = await supabase
          .from(TABLES.RECURRING_PAYMENTS)
          .insert([
            {
              user_id: user?.id,
              name: formData.name,
              amount,
              currency: formData.currency,
              frequency: formData.frequency,
              payment_source_id: formData.payment_source_id,
              start_date: formData.start_date
            }
          ])
          .select();
          
        if (error) throw error;
        
        if (data) {
          setRecurringPayments([...recurringPayments, ...data]);
        }
      } else if (modalMode === 'edit' && currentPayment) {
        // Update existing recurring payment
        const { data, error } = await supabase
          .from(TABLES.RECURRING_PAYMENTS)
          .update({
            name: formData.name,
            amount,
            currency: formData.currency,
            frequency: formData.frequency,
            payment_source_id: formData.payment_source_id,
            start_date: formData.start_date
          })
          .eq('id', currentPayment.id)
          .eq('user_id', user?.id)
          .select();
          
        if (error) throw error;
        
        if (data) {
          setRecurringPayments(
            recurringPayments.map(payment => 
              payment.id === currentPayment.id ? data[0] : payment
            )
          );
        }
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving recurring payment:', error.message);
      setError('Failed to save recurring payment. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentPayment) return;
    
    try {
      const { error } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .delete()
        .eq('id', currentPayment.id)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setRecurringPayments(
        recurringPayments.filter(payment => payment.id !== currentPayment.id)
      );
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting recurring payment:', error.message);
      setError('Failed to delete recurring payment. Please try again.');
    }
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case PAYMENT_FREQUENCIES.WEEKLY:
        return 'Weekly';
      case PAYMENT_FREQUENCIES.MONTHLY:
        return 'Monthly';
      case PAYMENT_FREQUENCIES.FOUR_WEEKS:
        return 'Every 4 Weeks';
      case PAYMENT_FREQUENCIES.YEARLY:
        return 'Yearly';
      default:
        return 'Unknown';
    }
  };

  // Format currency amount
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // Calculate next payment date
  const calculateNextPaymentDate = (payment: RecurringPayment) => {
    const startDate = new Date(payment.start_date);
    const today = new Date();
    let nextDate = new Date(startDate);
    
    // Skip if start date is in the future
    if (nextDate > today) {
      return nextDate.toLocaleDateString();
    }
    
    switch (payment.frequency) {
      case PAYMENT_FREQUENCIES.WEEKLY:
        while (nextDate < today) {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      case PAYMENT_FREQUENCIES.MONTHLY:
        while (nextDate < today) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      case PAYMENT_FREQUENCIES.FOUR_WEEKS:
        while (nextDate < today) {
          nextDate.setDate(nextDate.getDate() + 28);
        }
        break;
      case PAYMENT_FREQUENCIES.YEARLY:
        while (nextDate < today) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        break;
    }
    
    return nextDate.toLocaleDateString();
  };

  // Get payment source name by ID
  const getPaymentSourceName = (sourceId: string) => {
    const source = paymentSources.find(s => s.id === sourceId);
    return source ? source.name : 'Unknown source';
  };

  // Get identifier display for payment source
  const getSourceIdentifier = (sourceId: string) => {
    const source = paymentSources.find(s => s.id === sourceId);
    if (!source) return '';
    
    return source.type === 'bank_account' 
      ? `Account ending in ${source.identifier}`
      : `Card ending in ${source.identifier}`;
  };

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Recurring Payments</h2>
        <button 
          onClick={handleAddNew} 
          className="btn btn-primary btn-small"
        >
          Add New
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="error-message mb-4">{error}</div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : recurringPayments.length === 0 ? (
        <div className="text-center py-8">
          <p>No recurring payments added yet. Click "Add New" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringPayments.map(payment => (
            <div key={payment.id} className="card">
              <div className="card-header">
                <h3 className="font-bold">{payment.name}</h3>
                <div className="card-actions">
                  <button 
                    onClick={() => handleEdit(payment)} 
                    className="btn btn-small"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(payment)} 
                    className="btn btn-small btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="card-content">
                <p><strong>Amount:</strong> {formatCurrency(payment.amount, payment.currency)}</p>
                <p><strong>Frequency:</strong> {formatFrequency(payment.frequency)}</p>
                <p><strong>Payment Source:</strong> {getPaymentSourceName(payment.payment_source_id)} ({getSourceIdentifier(payment.payment_source_id)})</p>
              </div>
              <div className="card-footer">
                <p>Next payment: {calculateNextPaymentDate(payment)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for add/edit/delete */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {modalMode === 'add' 
                  ? 'Add Recurring Payment' 
                  : modalMode === 'edit' 
                    ? 'Edit Recurring Payment' 
                    : 'Delete Recurring Payment'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              {error && (
                <div className="error-message mb-4">{error}</div>
              )}
              
              {modalMode === 'delete' ? (
                <div>
                  <p className="mb-4">
                    Are you sure you want to delete the recurring payment "{currentPayment?.name}"?
                  </p>
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={handleCloseModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteConfirm}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Netflix, Gym Membership"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="amount">Amount</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="currency">Currency</label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="frequency">Frequency</label>
                    <select
                      id="frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      required
                    >
                      <option value={PAYMENT_FREQUENCIES.WEEKLY}>Weekly</option>
                      <option value={PAYMENT_FREQUENCIES.MONTHLY}>Monthly</option>
                      <option value={PAYMENT_FREQUENCIES.FOUR_WEEKS}>Every 4 Weeks</option>
                      <option value={PAYMENT_FREQUENCIES.YEARLY}>Yearly</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="payment_source_id">Payment Source</label>
                    <select
                      id="payment_source_id"
                      name="payment_source_id"
                      value={formData.payment_source_id}
                      onChange={handleInputChange}
                      required
                    >
                      {paymentSources.map(source => (
                        <option key={source.id} value={source.id}>
                          {source.name} ({getSourceIdentifier(source.id)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="start_date">Start Date</label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                    <small className="text-gray-500">
                      This is the date of the first payment
                    </small>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      type="button"
                      onClick={handleCloseModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="btn btn-primary"
                    >
                      {modalMode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}