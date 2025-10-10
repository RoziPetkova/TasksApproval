sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel"
    ],
    function (Controller, History, MessageToast, JSONModel) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.InvoiceDetails", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.controllers.InvoiceDetails
             */
            onInit() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("invoicedetails").attachPatternMatched(this.onObjectMatched, this);
            },

            /**
             * Set sticky headers for products table
             * @private
             */
            _setStickyHeaderForProductsTable: function () {
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

            onObjectMatched: async function (oEvent) {
                var sOrderID = oEvent.getParameter("arguments").OrderID;
                // Fetch all products for this OrderID and extract current invoice from the result
                await this.loadOrderData(sOrderID);
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
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                return new JSONModel({
                    invoiceDetails: [
                        { label: bundle.getText("orderIdColumn"), value: invoice.OrderID },
                        { label: bundle.getText("productNameColumn"), value: invoice.ProductName },
                        { label: bundle.getText("customerColumn"), value: invoice.CustomerName },
                        { label: bundle.getText("quantityLabel"), value: invoice.Quantity },
                        { label: bundle.getText("unitPriceLabel"), value: this.formatCurrency(invoice.UnitPrice) },
                        { label: bundle.getText("discountLabel"), value: (invoice.Discount * 100).toFixed(1) + "%" },
                        { label: bundle.getText("extendedPriceLabel"), value: this.formatCurrency(invoice.ExtendedPrice) },
                        { label: bundle.getText("salespersonLabel"), value: invoice.Salesperson },
                        { label: bundle.getText("shipperNameLabel"), value: invoice.ShipperName },
                        { label: bundle.getText("orderDateColumn"), value: this.formatDate(invoice.OrderDate) },
                        { label: bundle.getText("freightLabel"), value: this.formatCurrency(invoice.Freight) }
                    ]
                });
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

                        // Set invoice details model using the selected entry
                        var oInvoiceModel = this.loadInvoiceProperties(oInvoice);
                        this.getView().setModel(oInvoiceModel, "invoiceModel");

                        // Set products model with all entries - each entry represents one product line
                        var oProductsModel = new JSONModel({
                            products: data.value
                        });
                        this.getView().setModel(oProductsModel, "productsModel");

                        // Set sticky headers after data is loaded
                        this._setStickyHeaderForProductsTable();
                    }
                } catch (error) {
                    console.error("Error loading order data:", error);
                    var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(bundle.getText("failedToLoadOrderDataMessage"));
                    // Set empty models on error
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

            onGoToCustomerDetails: async function () {
                const oInvoiceModel = this.getView().getModel("invoiceModel");
                const aInvoiceDetails = oInvoiceModel.getProperty("/invoiceDetails");

                // Find customer name from the invoice details
                const oCustomerDetail = aInvoiceDetails.find(function (detail) {
                    return detail.label === this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("customerColumn");
                }.bind(this));

                if (oCustomerDetail && oCustomerDetail.value) {
                    const customerName = oCustomerDetail.value;
                    let oCustomer = null;

                    // Check if customers model exists
                    const oCustomersModel = this.getOwnerComponent().getModel("customers");
                    if (!oCustomersModel || !oCustomersModel.getProperty("/value")) {
                        // Model doesn't exist, fetch customer from API
                        oCustomer = await this.loadCustomerByName(customerName);
                    } else {
                        // Find CustomerID from CustomerName in existing model
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
                        var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                        MessageToast.show(bundle.getText("customerNotFoundMessage", [customerName]));
                        return null;
                    }
                } catch (error) {
                    console.error("Error loading customer by name:", error);
                    var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(bundle.getText("failedToLoadCustomerMessage", [customerName]));
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
                // Placeholder for save functionality
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageToast.show(bundle.getText("settingsSavedMessage"));
                this.settingsDialog.close();
            },

            onCloseDialog: function () {
                // Generic close function for all dialogs
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