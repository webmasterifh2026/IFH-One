import React, { forwardRef } from 'react';

interface PrintableIndentProps {
  form: any;
  rows: any[];
  referenceNo?: string;
}

export const PrintableIndent = forwardRef<HTMLDivElement, PrintableIndentProps>(
  ({ form, rows, referenceNo }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          padding: '40px',
          background: '#ffffff',
          color: '#000000',
          fontFamily: 'sans-serif',
          width: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '2px solid #000',
            paddingBottom: '20px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              INDIA FORGE AND DROP STAMPINGS
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#555' }}>
              Enterprise Procurement System
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0F7B45' }}>
              MATERIAL INDENT
            </h2>
            {referenceNo && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {referenceNo}
              </p>
            )}
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Meta Info */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            marginBottom: '30px',
            fontSize: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: '4px 0',
                      fontWeight: 'bold',
                      width: '120px',
                    }}
                  >
                    Requestor:
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    {form.requestorName} ({form.employeeId})
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Department:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.department}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Project:
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    {form.projectCode} - {form.projectName}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: '4px 0',
                      fontWeight: 'bold',
                      width: '120px',
                    }}
                  >
                    Application:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.application}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Priority:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.priority}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Required By:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.requiredByDate}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        {form.indentRemarks && (
          <div style={{ marginBottom: '30px', fontSize: '12px' }}>
            <h3
              style={{
                fontSize: '14px',
                borderBottom: '1px solid #ccc',
                paddingBottom: '4px',
                marginBottom: '8px',
              }}
            >
              Remarks
            </h3>
            <p style={{ margin: 0 }}>{form.indentRemarks}</p>
          </div>
        )}

        {/* Items Table */}
        <div style={{ marginBottom: '30px' }}>
          <h3
            style={{
              fontSize: '14px',
              borderBottom: '1px solid #ccc',
              paddingBottom: '4px',
              marginBottom: '8px',
            }}
          >
            Item Details
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  SKU Code
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'right',
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  UOM
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  Tech Spec
                </th>
                <th
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  Makes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {i + 1}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {row.skuCode}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {row.itemDescription}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ccc',
                      padding: '8px',
                      textAlign: 'right',
                    }}
                  >
                    {row.qty}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {row.uom}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {row.technicalSpec}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {row.approvedMakes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Requirements & Documents */}
        <div style={{ display: 'flex', gap: '40px', fontSize: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: '14px',
                borderBottom: '1px solid #ccc',
                paddingBottom: '4px',
                marginBottom: '8px',
              }}
            >
              Requirements
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Warranty:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.warranty}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Inspection:
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    {form.inspectionRequired}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Painting Spec:
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    {form.paintingSpecRemark || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Packing:
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    {form.packingRemarks || 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: '14px',
                borderBottom: '1px solid #ccc',
                paddingBottom: '4px',
                marginBottom: '8px',
              }}
            >
              Documents
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Certification:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.certification}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>
                    Manuals:
                  </td>
                  <td style={{ padding: '4px 0' }}>{form.manuals}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>GA:</td>
                  <td style={{ padding: '4px 0' }}>{form.ga}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            marginTop: '50px',
            paddingTop: '20px',
            borderTop: '1px solid #ccc',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          This is a system generated document. (v1.3.1)
        </div>
      </div>
    );
  }
);
PrintableIndent.displayName = 'PrintableIndent';
