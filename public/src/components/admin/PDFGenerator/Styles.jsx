import { StyleSheet } from '@react-pdf/renderer';

const blueColor = '#037bfc';
const orangeColor = '#d47e11';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 9, // decreased from 12
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    logo: {
        // width: 90,
        height: 50,
    },
    projectInfo: {
        flexDirection: 'column',
        textAlign: 'right',
        fontSize: 8,
    },
    projectLine1: {
        
        fontSize: 8, // decreased from 13
        fontWeight: 600,
        textTransform: 'uppercase',
        textAlign: 'right',
        color: blueColor,
    },
    projectLine2: {
        fontSize: 8, // decreased from 13
        fontWeight: 600,
        textTransform: 'uppercase',
        textAlign: 'right',
        color: blueColor,
    },
    projectCode: {
        fontSize: 8,
        fontWeight: 300,
        color: '#000',
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    companyInfo: {
        
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 20,
    },
    companyColumn: {
        flexDirection: 'column',
    },
    companyName: {
        
        fontSize: 11, // decreased from 14
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#000',
    },
    companyDetail: {
        fontSize: 11, // decreased from 14
        fontWeight: 300,
        textAlign: 'left',
        color: '#000',
    },
    referencesContainer: {
        marginBottom: 40,
        marginTop: 30,
        width: '100%'
    },

    references: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        fontSize: 9, // decreased from 12
        marginBottom: 20,
    },
    referenceText: {
        fontSize: 9, // decreased from 12
        fontWeight: 400,
        lineHeight: 1.5,
    },
    table: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: orangeColor,
    },
    tableRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingBottom: 5,
    },

    tableBodyRow: {
        flexDirection: 'row',
        paddingVertical: 2,
        paddingBottom: 15,


    },


    tableColDescriptionHeader: {
        flex: 5,
        fontWeight: 600,
        fontSize: 8, // decreased from 13
        color: blueColor,
        alignSelf: 'center',
        minHeight: 20
    },
    tableColHeader: {
        flex: 1,
        fontSize: 8, // decreased from 13
        color: blueColor,
        fontWeight: 600,
        textAlign: 'right',
        justifySelf: 'center',
        minHeight: 20
    },
    tableColAmountHeader: {
        flex: 2,
        fontSize: 8, // decreased from 13
        fontWeight: 600,
        color: blueColor,
        textAlign: 'right',
        textTransform: 'uppercase',
        alignSelf: 'center',
        minHeight: 20
    },


    tableColDescription: {
        flex: 5,
        fontWeight: 600,
        fontSize: 9, // decreased from 13
    },
    tableCol: {
        textAlign: 'right',
        flex: 1,
        fontSize: 8, // decreased from 13
    },
    tableColAmount: {
        textAlign: 'right',
        flex: 2,
        fontSize: 9, // decreased from 13
        fontWeight: 500,
    },
    tableBodyText: {
        flex: 1,
        fontSize: 8, // decreased from 11
        marginBottom: 4,

    },
    bankDetail: {
        marginTop: 20,

    },
    bankRow: {
        flexDirection: 'row',
        marginBottom: 2,
        width: '40%'
    },
    bankKey: {
        width: 200,
        fontWeight: 300,
        textTransform: 'capitalize',
        fontSize: 8,
        flex: 2
    },
    bankValue: {
        flex: 4,
        fontSize: 8,
        fontWeight: 300,
    },
    total: {
        marginTop: 40,
        marginBottom: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    totalLeft: {
        flex: 2,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    totalRight: {
        flex: 3,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 200,
    },
    totalRowDefault: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
        paddingBottom: 10

    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
        color: blueColor,
        textTransform: 'uppercase',
        fontSize: 10,
        fontWeight: 600,
    },
    paymentTerms: {
        marginTop: 30,
    },
    paymentLineLabel: {
        fontSize: 9, // decreased from 12
        fontWeight: 600,
        color: blueColor,

    },
    paymentLine: {
        fontSize: 8, // decreased from 12
        fontWeight: 400,


    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    signatureBlock: {
        flexDirection: 'column',
        flex: 1,
        marginRight: 10,
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        marginBottom: 2,

        marginRight: 140,
    },
    signatureText: {
        fontSize: 7, // decreased from 10
        fontWeight: 400,
        lineHeight: 1.2,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        width: '90%',   // ensures it spans properly
    },

    footerTitle: {
        fontSize: 10,
        color: '#404040',
        fontWeight: 600
    },
    footerLine: {
        fontSize: 10,
        color: '#adacac',
        fontWeight: 200
    },
});

export default styles;
