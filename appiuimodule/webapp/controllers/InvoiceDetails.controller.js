sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox"
    ],
    function (Controller, History, MessageToast, JSONModel, MessageBox) {
        "use strict";
        
        return Controller.extend("appiuimodule.controllers.InvoiceDetails", {
            _bundle: null,

            onInit() {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("invoicedetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched: async function (oEvent) {
                var sOrderID = oEvent.getParameter("arguments").OrderID;
                await this.loadOrderData(sOrderID);
                this.setStickyHeaderForProductsTable();
            },

            loadOrderData: async function (orderID) {
                const table = this.byId("productsTable");
                if (table) {
                    table.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$filter=OrderID eq ${orderID}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    if (data.value && data.value.length > 0) {
                        // Use any entry for invoice details
                        // since they all share the same order information (OrderID, CustomerName, OrderDate, etc.)
                        const oInvoice = data.value[0];
                        var oInvoiceModel = this.loadInvoiceProperties(oInvoice);
                        this.getView().setModel(oInvoiceModel, "invoiceModel");

                        var oProductsModel = new JSONModel({
                            products: data.value
                        });
                        this.getView().setModel(oProductsModel, "productsModel");
                    }
                } catch (error) {
                    console.error("Error loading order data:", error);
                    MessageBox.error(this._bundle.getText("failedToLoadOrderDataMessage"));
                    var oProductsModel = new JSONModel({
                        products: []
                    });
                    this.getView().setModel(oProductsModel, "productsModel");
                } finally {
                    if (table) {
                        table.setBusy(false);
                    }
                }
            },

            onNavBack() {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            setStickyHeaderForProductsTable: function () {
                sap.ui.require([
                    "sap/m/library"
                ], function (mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;

                    // Set sticky for products table
                    const oProductsTable = this.byId("productsTable");
                    if (oProductsTable) {
                        oProductsTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },

            formatCurrency: function (value) {
                if (!value) return "0.00";
                return parseFloat(value).toFixed(2);
            },

            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            formatDiscount: function (value) {
                if (!value) return "0%";
                return (value * 100).toFixed(1) + "%";
            },

            loadInvoiceProperties(invoice) {
                return new JSONModel({
                    invoiceDetails: [
                        { label: this._bundle.getText("orderIdColumn"), value: invoice.OrderID },
                        { label: this._bundle.getText("productNameColumn"), value: invoice.ProductName },
                        { label: this._bundle.getText("customerColumn"), value: invoice.CustomerName },
                        { label: this._bundle.getText("quantityLabel"), value: invoice.Quantity },
                        { label: this._bundle.getText("unitPriceLabel"), value: this.formatCurrency(invoice.UnitPrice) },
                        { label: this._bundle.getText("discountLabel"), value: (invoice.Discount * 100).toFixed(1) + "%" },
                        { label: this._bundle.getText("extendedPriceLabel"), value: this.formatCurrency(invoice.ExtendedPrice) },
                        { label: this._bundle.getText("salespersonLabel"), value: invoice.Salesperson },
                        { label: this._bundle.getText("shipperNameLabel"), value: invoice.ShipperName },
                        { label: this._bundle.getText("orderDateColumn"), value: this.formatDate(invoice.OrderDate) },
                        { label: this._bundle.getText("freightLabel"), value: this.formatCurrency(invoice.Freight) }
                    ]
                });
            },

            onGoToCustomerDetails: async function () {
                const oInvoiceModel = this.getView().getModel("invoiceModel");
                const aInvoiceDetails = oInvoiceModel.getProperty("/invoiceDetails");

                // Find customer name from the invoice details
                const oCustomerDetail = aInvoiceDetails.find(function (detail) {
                    return detail.label === this._bundle.getText("customerColumn");
                }.bind(this));

                if (oCustomerDetail && oCustomerDetail.value) {
                    const customerName = oCustomerDetail.value;
                    let oCustomer = null;

                    const oCustomersModel = this.getOwnerComponent().getModel("customers");
                    if (!oCustomersModel || !oCustomersModel.getProperty("/value")) {
                        oCustomer = await this.loadCustomerByName(customerName);
                    } else {
                        const aCustomers = oCustomersModel.getProperty("/value");
                        oCustomer = aCustomers.find(function (customer) {
                            return customer.CompanyName === customerName;
                        });
                        if (!oCustomer) {
                            oCustomer = await this.loadCustomerByName(customerName);
                        }
                    }
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: oCustomer.CustomerID });
                }
            },

            loadCustomerByName: async function (customerName) {
                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$filter=CompanyName eq '${customerName}'`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    if (data.value && data.value.length > 0) {
                        return data.value[0];
                    } else {
                        console.error("Customer not found in API:", customerName);
                        MessageBox.error(this._bundle.getText("customerNotFoundMessage", [customerName]));
                        return null;
                    }
                } catch (error) {
                    console.error("Error loading customer by name:", error);
                    MessageBox.error(this._bundle.getText("failedToLoadCustomerMessage", [customerName]));
                    return null;
                }
            },

            onHomePress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();
            },

            onSettingsSave: function () {
                MessageToast.show(this._bundle.getText("settingsSavedMessage"));
                this.settingsDialog.close();
            },

            onCloseDialog: function () {
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutPress: async function () {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
            },

            onLogoutConfirm: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
            }

        });
    }
);