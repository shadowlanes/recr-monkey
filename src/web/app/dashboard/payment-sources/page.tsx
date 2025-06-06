'use client';

import React, { useState } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { PAYMENT_SOURCE_TYPES, TABLES, supabase } from '../../lib/supabase';
import { PaymentSource } from '../../types';
import { useData } from '../../contexts/data-context';
import LoadingAnimation from '../../components/loading-animation';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export default function PaymentSources() { 
  const { user } = useAuth();
  const { 
    paymentSources, 
    isLoading, 
    error: contextError,
    addPaymentSource,
    updatePaymentSource,
    deletePaymentSource
  } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentSource, setCurrentSource] = useState<PaymentSource | null>(null);
  const [associatedPayments, setAssociatedPayments] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    type: 'bank_account' | 'debit_card' | 'credit_card';
    identifier: string;
  }>({
    name: '',
    type: PAYMENT_SOURCE_TYPES.BANK_ACCOUNT,
    identifier: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleAddNew = () => {
    setFormData({
      name: '',
      type: PAYMENT_SOURCE_TYPES.BANK_ACCOUNT,
      identifier: ''
    });
    setModalMode('add');
    setCurrentSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (source: PaymentSource) => {
    setFormData({
      name: source.name,
      type: source.type,
      identifier: source.identifier
    });
    setModalMode('edit');
    setCurrentSource(source);
    
    // Check for associated payments
    try {
      const { data, error } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('id, name')
        .eq('payment_source_id', source.id);
        
      if (error) throw error;
      
      setAssociatedPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching associated payments:', error.message);
      setAssociatedPayments([]);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = (source: PaymentSource) => {
    setCurrentSource(source);
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
      // Validate identifier is 4 digits
      if (!/^\d{4}$/.test(formData.identifier)) {
        setError('Identifier must be exactly 4 digits');
        return;
      }

      if (modalMode === 'add') {
        // Add new payment source using data context
        await addPaymentSource({
          user_id: user?.id || '',
          name: formData.name,
          type: formData.type,
          identifier: formData.identifier
        });
      } else if (modalMode === 'edit' && currentSource) {
        // Update existing payment source using data context
        await updatePaymentSource({
          ...currentSource,
          name: formData.name,
          type: formData.type,
          identifier: formData.identifier
        });
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving payment source:', error.message);
      setError('Failed to save payment source. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentSource) return;
    
    try {
      // Delete the payment source using data context
      await deletePaymentSource(currentSource.id);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting payment source:', error.message);
      setError(error.message || 'Failed to delete payment source. Please try again.');
    }
  };

  // Format source type for display
  const formatSourceType = (type: string) => {
    switch (type) {
      case PAYMENT_SOURCE_TYPES.BANK_ACCOUNT:
        return 'Bank Account';
      case PAYMENT_SOURCE_TYPES.DEBIT_CARD:
        return 'Debit Card';
      case PAYMENT_SOURCE_TYPES.CREDIT_CARD:
        return 'Credit Card';
      default:
        return 'Unknown';
    }
  };

  // Get identifier display based on source type
  const getIdentifierDisplay = (source: PaymentSource) => {
    if (source.type === PAYMENT_SOURCE_TYPES.BANK_ACCOUNT) {
      return `Account ending in ${source.identifier}`;
    } else {
      return `Card ending in ${source.identifier}`;
    }
  };

  // Determine which error to display (context error or local error)
  const displayError = error || contextError;

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4e5c6f]">Payment Sources</h2>
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
      ) : paymentSources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-[#fff0e6] rounded-full flex items-center justify-center mb-4">
            <CreditCardIcon className="w-8 h-8 text-[#e06c00]" />
          </div>
          <p className="text-[#4e5c6f] mb-4">No payment sources added yet. Click "Add New" to get started.</p>
          <button 
            onClick={handleAddNew} 
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Payment Source</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paymentSources.map(source => (
            <div key={source.id} className="card">
              <div className="card-header">
                <div className="flex items-center">
                  {source.type === PAYMENT_SOURCE_TYPES.BANK_ACCOUNT ? (
                    <BanknotesIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                  ) : (
                    <CreditCardIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                  )}
                  <h3 className="font-bold text-[#303030]">{source.name}</h3>
                </div>
                <div className="card-actions">
                  <button 
                    onClick={() => handleEdit(source)} 
                    className="icon-btn icon-btn-edit"
                    aria-label="Edit payment source"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(source)} 
                    className="icon-btn icon-btn-delete"
                    aria-label="Delete payment source"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="card-content">
                <p className="mb-1.5"><span className="font-medium text-[#303030]">Type:</span> {formatSourceType(source.type)}</p>
                <p><span className="font-medium text-[#303030]">Identifier:</span> {getIdentifierDisplay(source)}</p>
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
                  ? 'Add Payment Source' 
                  : modalMode === 'edit' 
                    ? 'Edit Payment Source' 
                    : 'Delete Payment Source'}
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
                      Are you sure you want to delete the payment source "<span className="font-semibold">{currentSource?.name}</span>"?
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
                <form onSubmit={handleSubmit}>
                  {modalMode === 'edit' && associatedPayments.length > 0 && (
                    <div className="bg-[#fff0e6] p-4 rounded-lg mb-5 border border-[#f4a261]">
                      <h3 className="font-medium text-[#e06c00] mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Associated Recurring Payments
                      </h3>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Personal Checking, Amazon Card"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="type">Type</label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value={PAYMENT_SOURCE_TYPES.BANK_ACCOUNT}>Bank Account</option>
                      <option value={PAYMENT_SOURCE_TYPES.DEBIT_CARD}>Debit Card</option>
                      <option value={PAYMENT_SOURCE_TYPES.CREDIT_CARD}>Credit Card</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="identifier">Last 4 Digits</label>
                    <input
                      type="text"
                      id="identifier"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleInputChange}
                      pattern="[0-9]{4}"
                      maxLength={4}
                      placeholder="Last 4 digits"
                      required
                    />
                    <small className="text-gray-500 mt-1 block">
                      Enter the last 4 digits of your account or card number
                    </small>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
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