# Requirements Document: Vendor RFQ Portal & Digital Quotation Collection System

## Introduction

IFH One v2.9.0 introduces a comprehensive Vendor RFQ Portal that automates the vendor quotation process. The system enables vendors to submit quotations online through secure, personalized forms, and allows procurement teams to centrally manage, compare, and negotiate vendor responses. This feature eliminates manual vendor communication, reduces data entry errors, and creates a structured audit trail for all procurement activities.

The system integrates with existing RFQ generation workflows and stores all vendor data in Google Sheets while maintaining secure file storage on Google Drive.

## Glossary

- **RFQ**: Request for Quotation - a formal request sent to vendors for pricing and terms information
- **Vendor**: External supplier providing quotations in response to RFQ
- **Procurement Team**: Internal users who create RFQs, review submissions, and negotiate with vendors
- **Administrator**: Internal user who configures templates and manages system access
- **Secure Token**: Unique identifier ensuring vendor can only access their assigned RFQ form
- **Line Item**: Individual product or service being quoted with associated pricing and details
- **Quotation**: Complete vendor response containing pricing, terms, and supporting documents
- **Commercial Terms**: Payment terms, delivery basis, freight arrangements, and insurance conditions
- **Submission Deadline**: Time-based expiration after which vendors cannot submit responses
- **Audit Trail**: Complete log of all system actions with timestamps and user identification
- **Pretty Printer**: Functionality to format stored quotation data back into readable/printable form
- **Round-Trip Property**: Characteristic that data can be transformed and reverse-transformed to original state

## Requirements

### Requirement 1: Secure Vendor Portal Access with Unique Authentication

**User Story:** As a vendor, I want to access my personalized RFQ form using a secure token, so that I can be confident only I can submit quotations for this RFQ.

#### Acceptance Criteria

1. WHEN a vendor receives an RFQ email invitation, THE Email SHALL contain a unique secure token and direct link to their RFQ form
2. WHEN a vendor navigates to their RFQ form using the unique token, THE System SHALL validate the token against stored RFQ submission records
3. IF the token is invalid or expired, THEN THE System SHALL reject access and display an error message
4. WHEN a vendor accesses their form with a valid token, THE System SHALL load only their assigned RFQ data
5. WHEN a vendor attempts to access another vendor's form using a different token, THE System SHALL reject the access
6. WHILE a vendor is on the RFQ form, THE System SHALL maintain the session with the valid token


### Requirement 2: Automatic RFQ Form Generation for Each Vendor

**User Story:** As a procurement team member, I want to automatically generate personalized RFQ forms for each vendor when creating an RFQ, so that I don't have to manually set up forms and reduce setup time.

#### Acceptance Criteria

1. WHEN an RFQ is created with a vendor list, THE System SHALL automatically generate one RFQ form for each vendor
2. WHEN forms are generated, THE System SHALL prefill all non-price fields with RFQ line items, product details, and procurement requirements
3. WHEN a form is generated, THE System SHALL create a unique secure token for each vendor
4. THE System SHALL generate a unique form URL for each vendor containing their secure token
5. WHEN forms are generated, THE System SHALL store form metadata including vendor name, vendor contact, RFQ reference, and form creation timestamp
6. WHERE the RFQ contains line items with images or technical specifications, THE System SHALL include those details in the generated form


### Requirement 3: Email Automation for RFQ Invitations

**User Story:** As a procurement team member, I want automated emails sent to all vendors when RFQ forms are generated, so that vendors immediately receive access instructions without manual email composition.

#### Acceptance Criteria

1. WHEN RFQ forms are generated, THE Email_Service SHALL automatically send an invitation email to each vendor's registered email address
2. WHEN an email is sent, THE Email SHALL include the vendor name, RFQ reference number, and personalized form link with their unique token
3. WHEN an email is sent, THE Email SHALL include the submission deadline and clear instructions on how to complete the form
4. WHEN an email is sent, THE Email SHALL include contact information for procurement support
5. WHEN an email is sent, THE System SHALL log the email event with timestamp, recipient address, and delivery status
6. WHEN email sending fails, THE System SHALL retry delivery up to 3 times with exponential backoff
7. IF email delivery fails after retries, THEN THE System SHALL notify the procurement team of the failed delivery and provide an option to resend manually


### Requirement 4: Submission Deadline Enforcement

**User Story:** As a procurement team member, I want to set submission deadlines for RFQ responses, so that vendors have a clear cutoff time and I can close the RFQ on schedule.

#### Acceptance Criteria

1. WHEN an RFQ is created, THE System SHALL accept a submission deadline date and time
2. WHEN a vendor attempts to access an RFQ form after the deadline, THE System SHALL display a message indicating the form is no longer accepting submissions
3. WHEN a vendor attempts to submit after the deadline, THE System SHALL reject the submission and display an error message
4. WHEN the current time reaches the submission deadline, THE System SHALL automatically lock the RFQ form and set its status to closed
5. WHILE the form is accessible, THE Vendor_Interface SHALL display the submission deadline prominently
6. WHEN the submission deadline is within 24 hours, THE System SHALL display a warning indicator to vendors


### Requirement 5: Product Pricing Data Collection

**User Story:** As a vendor, I want to enter pricing information for each product line item, so that procurement has accurate pricing for comparison.

#### Acceptance Criteria

1. THE RFQ_Form SHALL display all line items from the RFQ with product descriptions and quantities
2. WHEN a vendor enters a product price, THE System SHALL validate the price is a positive decimal number
3. WHEN a vendor enters pricing, THE System SHALL collect the following for each line item: unit price, total price for quantity, discount percentage, discount amount
4. WHEN a vendor enters a discount, THE System SHALL automatically calculate the discounted unit price and total amount
5. WHEN a vendor enters pricing data, THE System SHALL validate all prices are numeric and positive values
6. WHERE tax is applicable, THE Vendor_Form SHALL accept tax rate and calculate tax amount automatically
7. WHEN pricing is entered, THE System SHALL display running totals of line item costs


### Requirement 6: Commercial Terms Capture

**User Story:** As a vendor, I want to specify my commercial terms, so that procurement understands the full scope of my quotation including payment and delivery conditions.

#### Acceptance Criteria

1. THE RFQ_Form SHALL include fields for the following commercial terms: payment terms (days), advance payment percentage, credit days offered, freight basis
2. WHEN a vendor fills in commercial terms, THE System SHALL accept and store: freight cost, insurance cost, insurance included flag, packing cost included flag
3. THE RFQ_Form SHALL collect delivery basis information including lead time in days and delivery location
4. THE RFQ_Form SHALL collect warranty details: warranty period in months, warranty coverage description
5. WHEN a vendor specifies payment terms, THE System SHALL validate that advance percentage and credit days are within realistic ranges
6. THE RFQ_Form SHALL ask for country of origin and HSN (Harmonized System Nomenclature) code for each line item
7. WHEN a vendor enters commercial terms, THE System SHALL store all data with type validation for date ranges and numeric fields


### Requirement 7: Brand and Product Specification Capture

**User Story:** As a vendor, I want to specify the brand and exact specifications of the products I'm quoting, so that procurement knows exactly what I'm offering.

#### Acceptance Criteria

1. THE RFQ_Form SHALL include a field for brand/manufacturer name for each line item
2. WHEN a vendor enters a brand name, THE System SHALL store the brand as provided without validation or limiting to a predefined list
3. THE RFQ_Form SHALL include fields for technical specifications including model number, specification details
4. THE RFQ_Form SHALL allow vendors to specify if the product is original or alternative equivalent
5. WHERE a product has datasheets or technical documents, THE Vendor_Form SHALL accept file uploads for supporting documentation


### Requirement 8: Document Attachment Support

**User Story:** As a vendor, I want to upload supporting documents with my quotation, so that procurement has all necessary information for evaluation.

#### Acceptance Criteria

1. THE RFQ_Form SHALL allow vendors to upload documents including: quotation/invoice, datasheets, certificates, compliance documents
2. WHEN a vendor uploads a document, THE System SHALL validate the file type is one of: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
3. WHEN a vendor uploads a document, THE System SHALL validate the file size does not exceed 10 MB
4. THE System SHALL store uploaded documents on Google Drive with secure access controls
5. WHEN a document is uploaded, THE System SHALL generate a unique URL for the stored file
6. WHEN a document is uploaded, THE System SHALL log the file name, file size, upload timestamp, and document type
7. WHEN a vendor uploads a document, THE System SHALL associate the document with the vendor and line item reference


### Requirement 9: Vendor Digital Signature and Declaration

**User Story:** As a vendor, I want to digitally sign my quotation and declare its authenticity, so that procurement has verified that the submission is authorized.

#### Acceptance Criteria

1. BEFORE a vendor can submit the form, THE RFQ_Form SHALL require an explicit acceptance of terms and conditions
2. WHEN a vendor submits the form, THE System SHALL require entry of authorized signatory name and designation
3. WHEN a vendor submits the form, THE System SHALL require a digital signature or confirmation checkbox acknowledging the quotation is valid and authorized
4. WHEN a vendor submits the form, THE System SHALL capture and store the signature timestamp
5. WHERE digitally signed, THE System SHALL store a digital representation of the signature with verification capability
6. WHEN a vendor submits, THE System SHALL require them to acknowledge that all information provided is accurate and complete


### Requirement 10: Single Submission Enforcement and Read-Only Form After Submission

**User Story:** As a procurement team member, I want to ensure each vendor can only submit once and cannot modify their response after submission, so that responses remain locked and unaltered for evaluation.

#### Acceptance Criteria

1. WHEN a vendor submits their RFQ form, THE System SHALL mark the form as submitted
2. AFTER a vendor has submitted, WHEN the vendor attempts to access the form again, THE System SHALL display the form in read-only mode with all fields disabled
3. WHEN a vendor attempts to submit after their first submission, THE System SHALL reject the submission with a message indicating they already submitted
4. THE System SHALL store the submission status and timestamp with the vendor record
5. IF a vendor attempts to resubmit through any method, THEN THE System SHALL prevent the action and log the attempted duplicate submission
6. WHILE a form is in read-only mode after submission, THE System SHALL allow vendors to view their submitted data but not edit any fields


### Requirement 11: Real-Time Data Storage in Google Sheets

**User Story:** As a procurement team member, I want all vendor responses automatically stored in Google Sheets, so that I have structured, centralized access to all quotation data.

#### Acceptance Criteria

1. WHEN a vendor submits their RFQ form, THE System SHALL automatically create or update a row in a designated Google Sheet
2. WHEN submission data is stored, THE System SHALL include all collected information: vendor name, contact info, pricing, commercial terms, line item details
3. THE Google_Sheet SHALL have columns for: Vendor_Name, Contact_Email, RFQ_Reference, Line_Item_Number, Product_Description, Unit_Price, Quantity, Total_Price, Discount, Tax, Lead_Time, Payment_Terms, Warranty, Country_Of_Origin, HSN_Code, Submission_Timestamp, Signed_By, Signature_Timestamp
4. WHEN multiple line items are included in one vendor submission, THE System SHALL create a separate row for each line item maintaining the same vendor reference
5. WHEN submission data is stored, THE System SHALL validate that all required fields have values before writing to the sheet
6. WHILE data is being written to Google Sheets, THE System SHALL handle API rate limiting and retry failed writes


### Requirement 12: Pretty Printer for Quotation Formatting

**User Story:** As a procurement team member, I want to print or export vendor quotations in a formatted, readable report, so that I can share quotations with stakeholders in a professional format.

#### Acceptance Criteria

1. WHEN viewing a vendor's submitted quotation, THE System SHALL provide an export/print option
2. WHEN exporting a quotation, THE Pretty_Printer SHALL format all vendor data into a structured, readable document
3. THE Pretty_Printer SHALL include sections for: vendor details, all line items with pricing and specifications, commercial terms summary, attached documents list, and signature details
4. WHEN exporting to PDF, THE Pretty_Printer SHALL use consistent formatting with company branding where applicable
5. WHEN exporting to Excel, THE Pretty_Printer SHALL create a structured worksheet with header rows and formatted columns
6. THE Pretty_Printer SHALL include the RFQ reference, submission date, and deadline information in the formatted output


### Requirement 13: Round-Trip Data Integrity

**User Story:** As a system administrator, I want to verify that quotation data stored in Google Sheets can be parsed back to match original submissions, so that I have confidence in data integrity.

#### Acceptance Criteria

1. FOR ALL vendor quotations, WHEN data is written to Google Sheets and then parsed back, THE System SHALL produce quotation data equivalent to the original submission
2. WHEN a quotation is exported from Google Sheets, THE System SHALL parse all pricing fields maintaining decimal precision to 2 decimal places
3. WHEN quotation data is round-tripped, THE System SHALL maintain all relationships between line items and commercial terms
4. FOR ALL decimal values including pricing and percentages, THE Quotation_Parser SHALL accurately reconstruct values with no loss of precision beyond the 2 decimal place storage format
5. WHEN testing round-trip properties, THE System SHALL verify that vendor name, all line item details, and commercial terms match between original and reconstructed data


### Requirement 14: Procurement Dashboard for Quotation Comparison

**User Story:** As a procurement team member, I want to view all vendor responses in a comparison dashboard, so that I can evaluate and compare quotations side-by-side.

#### Acceptance Criteria

1. WHEN viewing an RFQ, THE Procurement_Dashboard SHALL display all submitted quotations from vendors
2. WHEN viewing the dashboard, THE System SHALL display vendor names, submission timestamps, and quotation status
3. THE Dashboard SHALL allow procurement to view pricing comparisons across vendors for each line item
4. WHEN comparing quotations, THE System SHALL calculate and display total cost per vendor including pricing, taxes, and commercial terms
5. WHERE documents are attached, THE Dashboard SHALL display the document list and allow downloading or previewing
6. WHEN viewing the dashboard, THE System SHALL display filters for RFQ status, vendor selection, and line item
7. WHEN viewing quotations, THE System SHALL display submission completeness status (all fields submitted, or indicate missing fields)


### Requirement 15: Vendor Negotiation and Counter-Offer Module

**User Story:** As a procurement team member, I want to send counter-offers and negotiate with selected vendors, so that I can work toward better terms and pricing.

#### Acceptance Criteria

1. WHEN reviewing vendor quotations, THE Procurement_Dashboard SHALL provide an option to initiate negotiations with selected vendors
2. WHEN a procurement member creates a counter-offer, THE System SHALL capture: requested adjustments to pricing, modified commercial terms, specific questions for the vendor
3. WHEN a counter-offer is created, THE System SHALL send an email to the vendor with the requested changes and a link to respond
4. WHEN a vendor receives a counter-offer, THEY SHALL be able to accept, reject, or submit a revised quotation
5. WHEN a vendor submits a revised quotation, THE System SHALL create a new submission record linked to the original with a negotiation iteration number
6. WHILE negotiations are ongoing, THE Procurement_Dashboard SHALL display the negotiation history and current status
7. WHEN negotiation is complete, THE System SHALL allow procurement to mark one vendor's quotation as accepted or rejected


### Requirement 16: Submission Confirmation Email to Vendors

**User Story:** As a vendor, I want to receive a confirmation when my quotation is successfully submitted, so that I have proof of submission.

#### Acceptance Criteria

1. WHEN a vendor successfully submits their RFQ form, THE Email_Service SHALL send a confirmation email to the vendor
2. WHEN confirmation email is sent, THE Email SHALL include: RFQ reference, submission timestamp, list of submitted line items, and total quoted amount
3. WHEN confirmation email is sent, THE Email SHALL include instructions for accessing the read-only form copy and contacting procurement if needed
4. WHEN email sending fails, THE System SHALL retry delivery up to 3 times
5. IF email delivery ultimately fails, THEN THE System SHALL notify procurement that submission confirmation failed for this vendor


### Requirement 17: Comprehensive Activity Audit Trail

**User Story:** As an administrator, I want to maintain a complete audit trail of all system activities related to quotations, so that I can track actions for compliance and troubleshooting.

#### Acceptance Criteria

1. THE System SHALL log all activities including: RFQ creation, form generation, email sends, vendor accesses, form submissions, modifications, negotiations
2. WHEN an activity is logged, THE Audit_Trail SHALL record: timestamp, user performing action, action type, affected entity IDs, action details
3. THE Audit_Trail SHALL maintain immutable records and not allow deletion or modification of historical entries
4. WHEN viewing activity logs, THE Procurement_Dashboard SHALL display all logged activities for an RFQ with filters by activity type, user, and date range
5. WHEN exporting an RFQ, THE System SHALL include the audit trail in the export package
6. THE Audit_Trail SHALL capture failed attempts including: invalid token access, expired form access, duplicate submission attempts


### Requirement 18: Email Activity Logging and Delivery Tracking

**User Story:** As a procurement team member, I want to see detailed logs of all emails sent through the system, so that I can verify vendor communication and troubleshoot delivery issues.

#### Acceptance Criteria

1. WHEN an email is sent by the system, THE Email_Logger SHALL record: recipient address, email subject, email body content, send timestamp, delivery status
2. WHEN email delivery succeeds, THE Email_Logger SHALL record delivery confirmation with timestamp
3. WHEN email delivery fails, THE Email_Logger SHALL record failure reason and retry attempts
4. WHEN viewing email logs, THE Procurement_Dashboard SHALL display all emails for an RFQ with status indicators
5. WHEN an email fails delivery, THE System SHALL provide an option to resend manually or view bounce/error details
6. WHERE bounce or rejection occurs, THE Email_Logger SHALL capture the bounce message for troubleshooting
7. THE Email_Logger SHALL retain all email records for at least 90 days


### Requirement 19: Secure Google Drive File Storage with URL Tracking

**User Story:** As an administrator, I want all uploaded documents securely stored on Google Drive with tracked access URLs, so that files are protected and accessible only through authorized channels.

#### Acceptance Criteria

1. WHEN vendors upload documents, THE File_Storage SHALL store files on Google Drive in a designated folder structure
2. WHEN a file is uploaded, THE System SHALL organize files by RFQ reference and vendor name
3. WHEN a file is stored on Google Drive, THE File_Storage SHALL create a unique, secure shareable URL
4. WHEN a URL is created, THE System SHALL track the URL with metadata: file name, upload timestamp, vendor reference, file size, expiration (if applicable)
5. WHEN viewing documents in procurement dashboard, THE System SHALL display document links that resolve through the system to Google Drive
6. WHEN a document is accessed via the system URL, THE File_Storage SHALL log the access with timestamp and user
7. WHEN Google Drive storage quota is low, THE System SHALL alert administrators and recommend cleanup


### Requirement 20: RFQ Status Lifecycle Management

**User Story:** As a procurement team member, I want to track the status of RFQs through their lifecycle, so that I know whether vendors are still responding, have responded, or if the RFQ is complete.

#### Acceptance Criteria

1. WHEN an RFQ is created, THE System SHALL set its status to Draft
2. WHEN RFQ forms are generated and emails sent, THE System SHALL change RFQ status to Open
3. WHEN a vendor submits a quotation, THE System SHALL update the RFQ status to show number of responses received
4. WHEN the submission deadline passes, THE System SHALL automatically change RFQ status to Closed
5. WHERE negotiation is initiated, THE System SHALL change RFQ status to In_Negotiation
6. WHEN procurement marks an RFQ as complete, THE System SHALL set status to Completed
7. THE Procurement_Dashboard SHALL display RFQ status with submission count and outstanding vendor count


### Requirement 21: Data Validation and Error Handling

**User Story:** As a system administrator, I want robust validation and error handling throughout the quotation collection process, so that data quality is maintained and users receive clear error messages.

#### Acceptance Criteria

1. WHEN a vendor enters data in the RFQ form, THE Form_Validator SHALL validate all inputs before allowing submission
2. IF a required field is empty, THEN THE System SHALL display a field-level error message identifying the missing field
3. IF a price field contains non-numeric characters, THEN THE System SHALL reject the input and display a validation error
4. WHEN validation fails, THE System SHALL prevent form submission and highlight all errors
5. IF a file upload exceeds size limits or has an unsupported format, THEN THE System SHALL reject the upload with a specific error message
6. IF Google Sheets write fails, THEN THE System SHALL log the error and retry, and if retries fail, notify procurement of the storage failure
7. IF email sending fails, THEN THE System SHALL capture the error and display it to the user without blocking other operations


### Requirement 22: Integration with Existing RFQ Workflow

**User Story:** As a procurement team member, I want the vendor portal to seamlessly integrate with the existing RFQ creation process, so that I don't need to enter RFQ data twice.

#### Acceptance Criteria

1. WHEN an RFQ is created in the existing system, THE System SHALL be able to pull RFQ data including line items, quantities, and requirements
2. WHEN forms are generated for vendors, THE System SHALL use data from the existing RFQ without requiring manual re-entry
3. WHEN vendors submit quotations, THE System SHALL link responses back to the original RFQ
4. WHEN RFQ data changes before form generation, THE System SHALL use the latest version for form generation
5. THE System SHALL maintain compatibility with existing RFQ fields and structure


### Requirement 23: Mobile-Responsive Vendor Interface

**User Story:** As a vendor, I want to access and fill the RFQ form on mobile devices, so that I can submit quotations from anywhere.

#### Acceptance Criteria

1. THE Vendor_Portal SHALL be responsive and functional on mobile devices (phones and tablets)
2. WHEN a vendor accesses the form on a mobile device, THE Interface SHALL adapt layout for smaller screens
3. THE Mobile_Interface SHALL maintain all functionality including pricing entry, document upload, and form submission
4. WHERE document upload is used on mobile, THE System SHALL allow camera capture or file selection
5. WHEN using the form on mobile, THE System SHALL maintain session security and token validation


### Requirement 24: User Access Control and Permissions

**User Story:** As an administrator, I want to control what procurement team members and vendors can access, so that sensitive data is only visible to authorized users.

#### Acceptance Criteria

1. WHEN a procurement team member logs in, THE System SHALL display only RFQs they are authorized to access
2. WHEN a vendor accesses the system, THE System SHALL only provide access to their assigned RFQ form via the secure token
3. WHEN administrators configure access, THE System SHALL allow setting permissions for: RFQ creation, form generation, vendor submission review, negotiation initiation
4. IF a user attempts to access an RFQ they don't have permission to view, THEN THE System SHALL deny access and log the attempt
5. WHEN a vendor receives an RFQ form link from someone else, THE System SHALL validate they have the correct secure token before granting access


### Requirement 25: Performance and Scalability

**User Story:** As a system administrator, I want the vendor portal to handle multiple concurrent vendor submissions, so that the system performs well under load.

#### Acceptance Criteria

1. WHEN multiple vendors submit quotations simultaneously, THE System SHALL handle concurrent submissions without data loss or corruption
2. WHEN writing to Google Sheets, THE System SHALL efficiently handle API rate limits and queue submissions if necessary
3. THE System SHALL be able to serve RFQ forms to 100 concurrent vendors without performance degradation
4. WHEN loading the procurement dashboard with 50 vendor responses, THE System SHALL display within 3 seconds
5. WHEN searching or filtering quotations in the dashboard, THE System SHALL return results within 2 seconds


## Acceptance Criteria Summary by Feature Area

### Security & Authentication
- Secure token-based access
- Single submission enforcement
- No cross-vendor access
- Expired form inaccessibility

### Data Collection
- Product pricing with auto-calculations
- Commercial terms capture
- Brand and specification details
- Document attachments up to 10MB
- Digital signature requirement

### Data Management
- Real-time Google Sheets storage
- Pretty printer for formatted output
- Round-trip data integrity
- Comprehensive audit trails
- Email activity logging

### User Interface & Experience
- Automatic form generation per vendor
- Read-only post-submission access
- Mobile-responsive design
- Clear deadline indicators
- Submission confirmation emails

### Procurement Operations
- Side-by-side quotation comparison
- Counter-offer negotiation module
- Vendor selection tracking
- Status lifecycle management
- Performance under concurrent load

### Integration & Compliance
- Seamless RFQ workflow integration
- Full audit trail maintained
- GDPR-compliant data handling
- Zero manual data entry
- Secure Google Drive storage

