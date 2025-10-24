'use client';

import React, { useState } from 'react';
import { useData } from '../../contexts/data-context';
import { PAYMENT_FREQUENCIES, getCurrencySymbol } from '../../lib/constants';
import { RecurringPayment } from '../../types';
import LoadingAnimation from '../../components/loading-animation';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  XMarkIcon,
  CalendarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function RecurringPayments() {
  // Use the centralized data context instead of local state
  const { 
    paymentSources, 
    recurringPayments, 
    isLoading, 
    error: dataError,
    addRecurringPayment,
    updateRecurringPayment,
    deleteRecurringPayment
  } = useData();
  
  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentPayment, setCurrentPayment] = useState<RecurringPayment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    frequency: PAYMENT_FREQUENCIES.MONTHLY,
    payment_source_id: '',
    start_date: new Date().toISOString().split('T')[0],
    category: 'Other' // Default category
  });
  const [error, setError] = useState<string | null>(null);

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
      start_date: new Date().toISOString().split('T')[0],
      category: 'Other' // Default category
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
      start_date: payment.start_date,
      category: payment.category || 'Other' // Set category from payment or default
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
        // Add new recurring payment using the data context
        const result = await addRecurringPayment({
          name: formData.name,
          amount,
          currency: formData.currency,
          frequency: formData.frequency,
          payment_source_id: formData.payment_source_id,
          start_date: formData.start_date,
          category: formData.category
        });
        
        if (result) {
          setIsModalOpen(false);
        }
      } else if (modalMode === 'edit' && currentPayment) {
        // Update existing recurring payment using the data context
        const result = await updateRecurringPayment(currentPayment.id, {
          name: formData.name,
          amount,
          currency: formData.currency,
          frequency: formData.frequency,
          payment_source_id: formData.payment_source_id,
          start_date: formData.start_date,
          category: formData.category
        });
        
        if (result) {
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error in form submission:', err);
      setError('An unexpected error occurred.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentPayment) return;
    
    // Delete the recurring payment using the data context
    const success = await deleteRecurringPayment(currentPayment.id);
    if (success) {
      setIsModalOpen(false);
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

  // Determine which error to display
  const displayError = error || dataError;

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4e5c6f]">Recurring Payments</h2>
        <button 
          onClick={handleAddNew} 
          className="btn btn-primary btn-small flex items-center gap-1"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add New</span>
        </button>
      </div>

      {displayError && !isModalOpen && (
        <div className="error-message mb-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <LoadingAnimation size="large" />
        </div>
      ) : recurringPayments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-[#fff0e6] rounded-full flex items-center justify-center mb-4">
            <ArrowPathIcon className="w-8 h-8 text-[#e06c00]" />
          </div>
          <p className="text-[#4e5c6f] mb-4">No recurring payments added yet. Click "Add New" to get started.</p>
          <button 
            onClick={handleAddNew} 
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Recurring Payment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recurringPayments.map(payment => (
            <div key={payment.id} className="card">
              <div className="card-header">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                  <h3 className="font-bold text-[#303030]">{payment.name}</h3>
                </div>
                <div className="card-actions">
                  <button 
                    onClick={() => handleEdit(payment)} 
                    className="icon-btn icon-btn-edit"
                    aria-label="Edit recurring payment"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(payment)} 
                    className="icon-btn icon-btn-delete"
                    aria-label="Delete recurring payment"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="card-content">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-lg font-semibold text-[#e06c00]">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <span className="bg-[#fff0e6] text-[#e06c00] px-2 py-0.5 rounded-full text-xs font-medium">
                    {formatFrequency(payment.frequency)}
                  </span>
                </div>
                {/* Add category display */}
                <div className="flex items-center mb-2 text-xs text-[#4e5c6f]">
                  <TagIcon className="w-4 h-4 mr-1" />
                  <span>{payment.category || 'Other'}</span>
                </div>
                <div className="flex items-center">
                  {paymentSources.find(s => s.id === payment.payment_source_id)?.type === 'bank_account' ? (
                    <BanknotesIcon className="w-4 h-4 mr-2 text-[#4e5c6f]" />
                  ) : (
                    <CreditCardIcon className="w-4 h-4 mr-2 text-[#4e5c6f]" />
                  )}
                  <span className="text-[#303030]">{getPaymentSourceName(payment.payment_source_id)}</span>
                </div>
              </div>
              <div className="card-footer">
                <div className="flex items-center text-[#4e5c6f]">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>Next payment: {calculateNextPaymentDate(payment)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for add/edit/delete */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-xl font-bold text-[#303030]">
                {modalMode === 'add' 
                  ? 'Add Recurring Payment' 
                  : modalMode === 'edit' 
                    ? 'Edit Recurring Payment' 
                    : 'Delete Recurring Payment'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="modal-body">
              {error && (
                <div className="error-message mb-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              
              {modalMode === 'delete' ? (
                <div>
                  <div className="bg-[#ffeae6] p-4 rounded-lg mb-4 flex items-center">
                    <TrashIcon className="w-6 h-6 text-[#d95a45] mr-3" />
                    <p className="mb-0">
                      Are you sure you want to delete the recurring payment "<span className="font-semibold">{currentPayment?.name}</span>"?
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button 
                      onClick={handleCloseModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteConfirm}
                      className="btn btn-danger flex items-center gap-1"
                    >
                      <TrashIcon className="w-5 h-5" />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="form-group">
                    <label htmlFor="name">Payment Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Netflix, Gym Membership"
                      required
                      className="focus:border-[#e06c00]"
                    />
                  </div>
                  
                  {/* Add Category field after name */}
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <TagIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="pl-10"
                      >
                        <option value="Subscription">Subscription</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Mortgage/Rent">Mortgage/Rent</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Health">Health</option>
                        <option value="Education">Education</option>
                        <option value="Savings">Savings</option>
                        <option value="Debt">Debt</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="amount">Amount</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">{getCurrencySymbol(formData.currency)}</span>
                        </div>
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
                          className="pl-7"
                        />
                      </div>
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
                        <option value="INR">INR</option>
                        <option value="AED">AED</option>
                        <option value="AUD">AUD</option>
                        <option value="CAD">CAD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="frequency">Payment Frequency</label>
                    <select
                      id="frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      required
                      className="pl-10"
                    >
                      <option value={PAYMENT_FREQUENCIES.WEEKLY}>Weekly</option>
                      <option value={PAYMENT_FREQUENCIES.MONTHLY}>Monthly</option>
                      <option value={PAYMENT_FREQUENCIES.FOUR_WEEKS}>Every 4 Weeks</option>
                      <option value={PAYMENT_FREQUENCIES.YEARLY}>Yearly</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                    </div>
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
                          {source.name} ({source.type === 'bank_account' ? 'Account' : 'Card'} ending in {source.identifier})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="start_date">Start Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        required
                        className="pl-10"
                      />
                    </div>
                    <small className="text-gray-500 mt-1 block">
                      This is the date of the first payment
                    </small>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button 
                      type="button"
                      onClick={handleCloseModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="btn btn-primary flex items-center gap-1"
                    >
                      {modalMode === 'add' ? (
                        <>
                          <PlusIcon className="w-5 h-5" />
                          Add
                        </>
                      ) : (
                        <>
                          <PencilIcon className="w-5 h-5" />
                          Update
                        </>
                      )}
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