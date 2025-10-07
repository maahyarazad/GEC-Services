import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import styles from './Styles';

import gec_logo from "../../../assets/media/bp-logo.png";
import { useEffect } from 'react';

const MyDocument = ({ formData, logo }) => {
    const subtotal = formData.items.reduce(
        (total, item) => total + (parseFloat(item.amount) || 0),
        0
    );


    const { positiveTotal, negativeTotal } = formData.items.reduce(
    (totals, item) => {
        const amount = parseFloat(item.amount) || 0;
        if (amount >= 0) {
        totals.positiveTotal += amount;
        } else {
        totals.negativeTotal += amount;
        }
        return totals;
    },
    { positiveTotal: 0, negativeTotal: 0 }
    );



    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Image src={gec_logo} style={styles.logo} />
                    <View style={styles.projectInfo}>
                        <Text style={styles.projectLine1}>{formData.project.project_name}</Text>
                        <Text style={styles.projectLine2}>{formData.project.project_name_ll2}</Text>
                        <Text style={styles.projectCode}>{formData.project.project_name_code}</Text>
                    </View>
                </View>

                {/* Company Info */}
                <View style={styles.companyInfo}>
                    <View style={styles.companyColumn}>
                        <Text style={styles.companyName}>{formData.company.company_name}</Text>
                        <Text style={styles.companyDetail}>{formData.company.company_address}</Text>
                        <Text style={styles.companyDetail}>{formData.company.company_postal_city}</Text>
                        <Text style={styles.companyDetail}>{formData.company.company_country}</Text>
                    </View>
                </View>

                {/* References */}
                <View>
                    <View style={styles.referencesContainer}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>


                            <View style={{ flex: 1 }}>
                                <Text style={styles.referenceText}>References</Text>
                                <Text style={styles.referenceText}>{formData.reference.reference_number}</Text>
                            </View>


                            <View style={{ flex: 2 }}>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_name_1}</Text>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_number_1}</Text>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_email_1}</Text>
                            </View>

                            <View style={{ flex: 2 }}>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_name_2}</Text>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_number_2}</Text>
                                <Text style={styles.referenceText}>{formData.reference.reference_contact_person_email_2}</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.referenceText}>Date</Text>
                                <Text style={styles.referenceText}>{formData.reference.date}</Text>
                            </View>

                        </View>

                    </View>

                </View>

                {/* Description Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.tableColDescriptionHeader}>Description</Text>
                        <Text style={styles.tableColHeader}>QTY</Text>
                        <Text style={styles.tableColHeader}>DISC</Text>
                        <Text style={styles.tableColHeader}>VAT%</Text>
                        <Text style={styles.tableColHeader}>VAT</Text>
                        <Text style={styles.tableColAmountHeader}>AMOUNT</Text>
                    </View>

                    {/* Items */}
                    {formData.items.map((item, i) => (
                        
                        <View key={`item-${i}`}>
                            <View style={styles.tableRow} key={`item-${i}`}>
                                <Text style={styles.tableColDescription}>{item.title || "No Title"}</Text>
                                <Text style={styles.tableCol}>{item.qty || "-"}</Text>
                                <Text style={styles.tableCol}>{item.disc || "0%"}</Text>
                                <Text style={styles.tableCol}>{item.vat_p || "0"}</Text>
                                <Text style={styles.tableCol}>{item.vat || "-"}</Text>
                                <Text style={styles.tableColAmount}>AED {item.amount || "0"}</Text>
                            </View>
                            {item.body !== null && (
                                <View style={styles.tableBodyRow}>
                                    <Text style={styles.tableBodyText} flex={6}>
                                        {Object.entries(item).map(([key, value]) => {

                                            switch (key) {
                                                case "body":
                                                    return value.split("\n").map((line, j) => (
                                                        <Text key={j}>
                                                            {line}
                                                            {"\n"}
                                                        </Text>
                                                    ));
                                                default:
                                                    return null;
                                            }
                                        })}
                                    </Text>
                                </View>
                            )}



                        </View>
                    ))}
                </View>

                {/* Bank Details */}
                <View style={styles.bankDetail}>
                    {Object.entries(formData.bank_detail).map(([key, value]) => (
                        <View style={styles.bankRow} key={key}>
                            <Text style={styles.bankKey}>{key.replace(/_/g, " ")}</Text>
                            <Text style={styles.bankValue}>{value}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.total}>
                    <View style={styles.totalLeft}>
                        <View style={styles.totalRowDefault}>
                            <Text>Subtotal:</Text>
                            <Text>AED {positiveTotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRowDefault}>
                            <Text style={styles.totalRow}>Total:</Text>
                            <Text style={styles.totalRow}>AED {Number(positiveTotal.toFixed(2)) + Number(negativeTotal.toFixed(2))}</Text>
                        </View>
                    </View>

                    <View style={styles.totalRight}>
                        <Text>Reference:</Text>
                        <Text style={{ paddingLeft: 10 }}>please mention
                            <Text style={{ fontWeight: 600 }}>{formData.reference.reference_number}</Text>
                        </Text>
                    </View>

                </View>

                {/* Payment Terms */}
                <View style={styles.paymentTerms}>
                    {formData.payment_terms.line1 != null && (
                        <>
                            <Text style={styles.paymentLineLabel}>Payment Terms:</Text>
                            <Text style={styles.paymentLine}>{formData.payment_terms.line1}</Text>
                        </>
                    )}
                    {formData.payment_terms.line2 !== null && (
                        <>
                            <Text style={styles.paymentLineLabel}>Not Included in the offer:</Text>
                            <Text style={styles.paymentLine}>{formData.payment_terms.line2}</Text>
                        </>
                    )}

                    {/* Signature section */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 40 }}>

                        {/* Left signature */}


                        <View style={{ flex: 1, paddingRight: 10 }}
                            wrap={false}
                            render={({ pageNumber, totalPages }) => {
                                if (formData.payment_terms.signature_left_name !== "") {
                                    return (
                                        <View>
                                            <View style={styles.signatureLine}></View>
                                            <Text style={styles.signatureText}>
                                                {formData.payment_terms.signature_left_name}
                                            </Text>
                                            <Text style={styles.signatureText}>
                                                {formData.payment_terms.signature_left_title}
                                            </Text>
                                        </View>
                                    );
                                }
                            }}
                        />


                        {/* Right signature */}
                        <View style={{ flex: 1, paddingLeft: 10, marginBottom: 20 }} render={({ pageNumber, totalPages }) => {
                            if (formData.payment_terms.signature_right_name !== "") {

                                return (
                                    <View>

                                        <View style={styles.signatureLine} />
                                        <Text style={styles.signatureText}>
                                            {formData.payment_terms.signature_right_name}
                                        </Text>
                                        <Text style={styles.signatureText}>
                                            {formData.payment_terms.signature_right_title}
                                        </Text>
                                    </View>
                                );
                            }
                        }}/>
                        

                    </View>
                </View>

                {/* Signature section */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 40 }}>


                    <View style={{ flex: 1, paddingRight: 10, marginBottom: 20 }}>

                    </View>

                    {/* Bottom-right signature */}
                    <View style={{ flex: 1, paddingLeft: 10 }}>

                        <Text style={styles.signatureText}>
                            Understood, agreed, and accepted:
                        </Text>

                    </View>

                </View>

                {/* Signature section */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 40 }}>


                    <View style={{ flex: 1, paddingRight: 10, marginBottom: 20 }}>

                    </View>

                    {/* Bottom-right signature */}
                     <View style={{ flex: 1, paddingLeft: 10, marginBottom: 20 }} render={({ pageNumber, totalPages }) => {
                            if (formData.payment_terms.signature_bottom_right_name !== "") {

                                return (
                                    <View>

                                        <View style={styles.signatureLine} />
                                        <Text style={styles.signatureText}>
                                            {formData.payment_terms.signature_bottom_right_name}
                                        </Text>
                                        <Text style={styles.signatureText}>
                                            {formData.payment_terms.signature_bottom_right_title}
                                            {formData.payment_terms.signature_bottom_right_company}
                                        </Text>
                                    </View>
                                );
                            }
                        }}/>

                </View>

                <View style={styles.footer} fixed
                    render={({ pageNumber, totalPages }) => {
                        if (pageNumber === totalPages) {
                            return (
                                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                                    {/* Column 1 */}
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={styles.footerTitle}>BUENA PUBLICA FZE</Text>
                                        <Text style={styles.footerLine}>BUILDING C1</Text>
                                        <Text style={styles.footerLine}>OFFICE 1208</Text>
                                        <Text style={styles.footerLine}>AJMAN FREEZONE, AJMAN</Text>
                                        <Text style={styles.footerLine}>UNITED ARAB EMIRATES</Text>
                                    </View>

                                    {/* Column 2 */}
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={styles.footerTitle}>Management</Text>
                                        <Text style={styles.footerLine}>JAN A. HUSSING</Text>
                                    </View>

                                    {/* Column 3 */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.footerTitle}>BANK: ABU DHABI COMMERCIAL BANK</Text>
                                        <Text style={styles.footerLine}>ACCOUNT: 1200563292001</Text>
                                        <Text style={styles.footerLine}>BIC: ADCBAEAA</Text>
                                        <Text style={styles.footerLine}>IBAN: AE 02 0030 0120 0563 2920 001</Text>
                                    </View>
                                </View>
                            );
                        }
                    }}

                />


            </Page>
        </Document>
    );
};

export default MyDocument;
