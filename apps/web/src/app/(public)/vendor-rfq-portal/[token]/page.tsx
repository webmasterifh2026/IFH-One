'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Download, FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { useVendorForm, useSubmitVendorQuotation, useUploadVendorAttachment } from '@/hooks/useVendorRFQ';
import { formatDate } from '@/lib/procurement-stages';

export default function VendorRFQPortalPage() {
  const params = useParams();
  const token = params.token as string;
  
  const { data: form, isLoading, error } = useVendorForm(token);
  const submitMutation = useSubmitVendorQuotation();
  const uploadMutation = useUploadVendorAttachment();

  const [expandedSections, setExpandedSections] = useState({
    rfqDetails: true,
    products: true,
    quotation: true,
    commercial: true,
    declaration: true,
  });

  const [formData, setFormData] = useState({
    lineItems: [] as any[],
    authorizedPerson: '',
    designation: '',
    paymentTerms: '',
    deliveryBasis: '',
    warranty: '',
    digitalSignature: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File[]>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (form?.quotation?.lineItems) {
      setFormData(prev => ({
        ...prev,
        lineItems: form.quotation!.lineItems.map(item => ({
          ...item,
          quotedRate: item.quotedRate || 0,
          discountPercentage: item.discountPercentage || 0,
          gstPercentage: item.gstPercentage || 0,
          freightCharges: item.freightCharges || 0,
          packingCharges: item.packingCharges || 0,
          totalAmount: item.totalAmount || 0,
        })),
      }));
    }
  }, [form]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, section: string) => {
    if (!e.target.files || form?.quotation?.id) return;
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => ({
      ...prev,
      [section]: [...(prev.get(section) || []), ...files],
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.lineItems];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-calculate totals if applicable
      if (['quotedRate', 'discountPercentage', 'gstPercentage', 'freightCharges', 'packingCharges'].includes(field)) {
        const item = newItems[index];
        const baseTotal = (item.quotedRate || 0) * (item.quantity || 1);
        const discountAmount = baseTotal * ((item.discountPercentage || 0) / 100);
        const gstAmount = (baseTotal - discountAmount) * ((item.gstPercentage || 0) / 100);
        item.totalAmount = baseTotal - discountAmount + gstAmount + (item.freightCharges || 0) + (item.packingCharges || 0);
      }
      
      return { ...prev, lineItems: newItems };
    });
  };

  const handleSubmit = async () => {
    if (!form) return;
    
    setSubmitting(true);
    try {
      // Calculate grand total
      const grandTotalAmount = formData.lineItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

      // Submit quotation
      const quotation = await submitMutation.mutateAsync({
        vendorFormId: form.id,
        rfqId: form.rfqId,
        data: {
          ...formData,
          grandTotalAmount,
          lineItems: formData.lineItems,
        },
      });

      // Upload files if any
      for (const [section, files] of uploadedFiles) {
        for (const file of files) {
          await uploadMutation.mutateAsync({
            quotationId: quotation.id,
            file,
            documentType: section,
          });
        }
      }

      setSuccessMessage('Quotation submitted successfully!');
      setTimeout(() => {
        window.location.href = '/vendor-portal/success';
      }, 2000);
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading RFQ form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const rawError = error instanceof Error ? error.message : String(error);
    const isExpired = rawError.toLowerCase().includes('expire');
    const isDeadline = rawError.toLowerCase().includes('deadline');
    const isInvalid = rawError.toLowerCase().includes('invalid');
    
    let displayError = 'Please contact the procurement team for assistance.';
    if (isExpired || isDeadline) {
      displayError = 'This quotation request has expired or is no longer accepting quotations.';
    } else if (isInvalid || rawError.includes('404')) {
      displayError = 'Invalid vendor access link.';
    } else if (rawError) {
      displayError = rawError;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to Load RFQ</h2>
              <p className="text-gray-600 text-sm mb-4">
                {displayError}
              </p>
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact the procurement team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const isAlreadySubmitted = !!form?.quotation || form?.formStatus === 'SUBMITTED';
  const isExpired = form && new Date(form.submissionDeadline) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Quotation Form</h1>
              <p className="text-gray-500">RFQ {form.rfqNumber}</p>
            </div>
            <div className="text-right">
              {isAlreadySubmitted && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Submitted</span>
                </div>
              )}
              {isExpired && !isAlreadySubmitted && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Expired</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Buyer</p>
              <p className="text-sm font-medium text-gray-900">{form.buyerName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Vendor</p>
              <p className="text-sm font-medium text-gray-900">{form.vendorName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Deadline</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(form.submissionDeadline)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Expected Delivery</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(form.expectedDeliveryDate)}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* RFQ Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('rfqDetails')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">RFQ Details</h2>
            {expandedSections.rfqDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.rfqDetails && (
            <div className="px-6 py-4 border-t border-gray-100 space-y-4 bg-gray-50/50">
              {form.generalRemarks && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">General Remarks</p>
                  <p className="text-sm text-gray-700 p-3 bg-white rounded-lg border border-gray-200">{form.generalRemarks}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('products')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">Products & Pricing</h2>
            {expandedSections.products ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.products && (
            <div className="px-6 py-4 border-t border-gray-100 space-y-6 bg-gray-50/50">
              {formData.lineItems.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{item.itemName}</p>
                      {item.itemCode && <p className="text-xs text-gray-500">SKU: {item.itemCode}</p>}
                      {item.itemRemarks && <p className="text-xs text-amber-600 mt-1 font-medium">Note: {item.itemRemarks}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        {item.quantity} {item.unitOfMeasure || item.uom || '—'}
                      </span>
                      {item.unitWeight && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          Wt: {item.totalWeight} ({item.unitWeight}/unit)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Quoted Rate</label>
                      <input
                        type="number"
                        value={item.quotedRate}
                        onChange={(e) => handleLineItemChange(idx, 'quotedRate', parseFloat(e.target.value))}
                        disabled={isAlreadySubmitted || isExpired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Discount %</label>
                      <input
                        type="number"
                        value={item.discountPercentage || 0}
                        onChange={(e) => handleLineItemChange(idx, 'discountPercentage', parseFloat(e.target.value))}
                        disabled={isAlreadySubmitted || isExpired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">GST %</label>
                      <input
                        type="number"
                        value={item.gstPercentage || 0}
                        onChange={(e) => handleLineItemChange(idx, 'gstPercentage', parseFloat(e.target.value))}
                        disabled={isAlreadySubmitted || isExpired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Freight</label>
                      <input
                        type="number"
                        value={item.freightCharges || 0}
                        onChange={(e) => handleLineItemChange(idx, 'freightCharges', parseFloat(e.target.value))}
                        disabled={isAlreadySubmitted || isExpired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Packing</label>
                      <input
                        type="number"
                        value={item.packingCharges || 0}
                        onChange={(e) => handleLineItemChange(idx, 'packingCharges', parseFloat(e.target.value))}
                        disabled={isAlreadySubmitted || isExpired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Total</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-semibold text-gray-900">
                        {item.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Lead Time: {item.leadTimeDays} days | Brand: {item.brandOffered || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commercial Terms Section */}
        {!isAlreadySubmitted && !isExpired && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
            <button
              onClick={() => toggleSection('commercial')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900">Commercial Terms</h2>
              {expandedSections.commercial ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expandedSections.commercial && (
              <div className="px-6 py-4 border-t border-gray-100 space-y-4 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Payment Terms</label>
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                      placeholder="e.g., Net 30, 50/50 split"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Delivery Basis</label>
                    <input
                      type="text"
                      value={formData.deliveryBasis}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryBasis: e.target.value }))}
                      placeholder="e.g., FOB, CIF, DDP"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Warranty</label>
                    <input
                      type="text"
                      value={formData.warranty}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                      placeholder="e.g., 12 months, 24 months"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Upload Section */}
        {!isAlreadySubmitted && !isExpired && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
            <button
              onClick={() => toggleSection('declaration')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900">Supporting Documents</h2>
              {expandedSections.declaration ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expandedSections.declaration && (
              <div className="px-6 py-4 border-t border-gray-100 space-y-4 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['QUOTATION', 'DATASHEET', 'COMPLIANCE_CERTIFICATE', 'BROCHURE'].map(docType => (
                    <div key={docType} className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Upload className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-600">{docType.replace(/_/g, ' ')}</span>
                        </div>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e, docType)}
                          className="hidden"
                          multiple
                        />
                        <p className="text-xs text-gray-500 text-center">(Click to upload)</p>
                      </label>
                      {uploadedFiles.get(docType) && uploadedFiles.get(docType)!.length > 0 && (
                        <p className="text-xs text-emerald-600 mt-2 font-semibold">
                          {uploadedFiles.get(docType)!.length} file(s) selected
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Authorized Person Section */}
        {!isAlreadySubmitted && !isExpired && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Authorization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Authorized Person Name</label>
                <input
                  type="text"
                  value={formData.authorizedPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, authorizedPerson: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          {!isAlreadySubmitted && !isExpired && (
            <>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.authorizedPerson || !formData.designation}
                className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Quotation
              </button>
            </>
          )}
          {(isAlreadySubmitted || isExpired) && (
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
