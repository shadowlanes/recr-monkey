'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { supabase, TABLES, PAYMENT_SOURCE_TYPES } from '../../lib/supabase';
import { PaymentSource } from '../../types';

export default function PaymentSources() { 
  const { user } = useAuth();
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [currentSource, setCurrentSource] = useState<PaymentSource | null>(null);
  const [associatedPayments, setAssociatedPayments] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: PAYMENT_SOURCE_TYPES.BANK_ACCOUNT,
    identifier: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Load payment sources
  useEffect(() => {
    if (user) {
      loadPaymentSources();
    }
  }, [user]);

  const loadPaymentSources = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
        
      if (error) throw error;
      
      setPaymentSources(data || []);
    } catch (error: any) {
      console.error('Error loading payment sources:', error.message);
      setError('Failed to load payment sources. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
    
    // Fetch associated recurring payments
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
        // Add new payment source
        const { data, error } = await supabase
          .from(TABLES.PAYMENT_SOURCES)
          .insert([
            {
              user_id: user?.id,
              name: formData.name,
              type: formData.type,
              identifier: formData.identifier
            }
          ])
          .select();
          
        if (error) throw error;
        
        if (data) {
          setPaymentSources([...paymentSources, ...data]);
        }
      } else if (modalMode === 'edit' && currentSource) {
        // Update existing payment source
        const { data, error } = await supabase
          .from(TABLES.PAYMENT_SOURCES)
          .update({
            name: formData.name,
            type: formData.type,
            identifier: formData.identifier
          })
          .eq('id', currentSource.id)
          .eq('user_id', user?.id)
          .select();
          
        if (error) throw error;
        
        if (data) {
          setPaymentSources(
            paymentSources.map(source => 
              source.id === currentSource.id ? data[0] : source
            )
          );
        }
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
      // Check if payment source is used by any recurring payments
      const { data: associatedPayments, error: checkError } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('id, name')
        .eq('payment_source_id', currentSource.id);
        
      if (checkError) throw checkError;
      
      if (associatedPayments && associatedPayments.length > 0) {
        setError(`This payment source is used by ${associatedPayments.length} recurring payment(s). Please update those payments first.`);
        return;
      }

      // Delete the payment source
      const { error } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .delete()
        .eq('id', currentSource.id)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      setPaymentSources(
        paymentSources.filter(source => source.id !== currentSource.id)
      );
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting payment source:', error.message);
      setError('Failed to delete payment source. Please try again.');
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

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Payment Sources</h2>
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
      ) : paymentSources.length === 0 ? (
        <div className="text-center py-8">
          <p>No payment sources added yet. Click "Add New" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentSources.map(source => (
            <div key={source.id} className="card">
              <div className="card-header">
                <h3 className="font-bold">{source.name}</h3>
                <div className="card-actions">
                  <button 
                    onClick={() => handleEdit(source)} 
                    className="btn btn-small"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(source)} 
                    className="btn btn-small btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="card-content">
                <p><strong>Type:</strong> {formatSourceType(source.type)}</p>
                <p><strong>Identifier:</strong> {getIdentifierDisplay(source)}</p>
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
                  ? 'Add Payment Source' 
                  : modalMode === 'edit' 
                    ? 'Edit Payment Source' 
                    : 'Delete Payment Source'}
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
                    Are you sure you want to delete the payment source "{currentSource?.name}"?
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
                  {modalMode === 'edit' && associatedPayments.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded mb-4 border border-blue-200">
                      <h3 className="font-medium text-blue-800 mb-2">
                        Associated Recurring Payments ({associatedPayments.length})
                      </h3>
                      <ul className="list-disc pl-5 text-sm text-blue-700">
                        {associatedPayments.map(payment => (
                          <li key={payment.id}>{payment.name}</li>
                        ))}
                      </ul>
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
                    <small className="text-gray-500">
                      Enter the last 4 digits of your account or card number
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