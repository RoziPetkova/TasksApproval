sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/json/JSONModel",
        "../utils/Formatter",
        "../utils/Helper",
        "../utils/Constants"
    ],
    function (Controller, Filter, FilterOperator, JSONModel, Formatter, Helper, Constants) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.CustomerDetails", {
            formatter: Formatter,

            onInit() {
                this.bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._router = this.getOwnerComponent().getRouter();
                //The context (scope) for the callback function
                // Ensures that inside onPatternMatched, this refers to the
                // controller instance
                this._router.getRoute("customerdetails").attachPatternMatched(this.onPatternMatched, this);
            },

            onPatternMatched: function (oEvent) {
                var sCustomerId = oEvent.getParameter("arguments").CustomerID;
                this.bindCustomerData(sCustomerId);

                this.filterCustomerOrdersJSON(sCustomerId);
                this.filterCustomerInvoices(sCustomerId);

                this.setStickyHeadersForTables();
            },

            bindCustomerData: function (sCustomerId) {

                // Without element binding:

                //   oModel.read("/Customers('" + sCustomerId + "')", {
                //       success: function(data) {
                //           var oCustomerModel = new JSONModel(data);
                //           oView.setModel(oCustomerModel, "customer");
                //           oView.setBusy(false);
                //       }
                //   });

                const oView = this.getView();
                const sPath = "/Customers('" + sCustomerId + "')";

                // What bindElement does:
                //   - Makes an OData request to fetch the customer data
                //   - Binds the entire view to this single customer entity
                //   - All controls in the view can now use
                //   {odataModel>PropertyName} to access customer properties; like shortcut to the properties
                oView.bindElement({
                    path: sPath,
                    model: "odataModel",
                    events: {
                        dataRequested: function () {
                            oView.setBusy(true);
                        },
                        dataReceived: function () {
                            oView.setBusy(false);
                        }
                    }
                });
            },

            filterCustomerOrdersJSON: function (sCustomerId) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                const allOrders = oOrdersModel.getData();

                const customerOrders = allOrders.filter(function (order) {
                    return order.CustomerID === sCustomerId;
                });

                const oCustomerOrdersModel = new JSONModel(customerOrders);
                this.getView().setModel(oCustomerOrdersModel, "customerOrders");
            },

            filterCustomerInvoices: function (sCustomerId) {
                const oTable = this.byId("customerInvoicesTable");

                const oBinding = oTable.getBinding("items");
                const oFilter = new Filter("CustomerID", FilterOperator.EQ, sCustomerId);
                oBinding.filter([oFilter], "Application");
            },

            setStickyHeadersForTables: function () {
                Helper.setStickyHeader(this, "customerOrdersTable");
                Helper.setStickyHeader(this, "customerInvoicesTable");
            },

            onNavBack() {
                Helper.onNavBack(this);
            },

            onCustomerOrderPress(oEvent) {
                const oOrder = oEvent.getSource().getBindingContext("customerOrders").getObject();
                this._router.navTo("orderdetails", { OrderID: oOrder.OrderID });
            },

            onCustomerInvoicePress(oEvent) {
                const oInvoice = oEvent.getSource().getBindingContext("odataModel").getObject();
                this._router.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID
                });
            },

            onHomePress: function () {
                Helper.onHomePress(this);
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            },

            onSortOrdersColumn: function (oEvent) {
                Helper.onSortColumnJSON(oEvent, this, "customerOrdersTable", "customerOrders", "/");
            },

            onSortInvoicesColumn: function (oEvent) {
                Helper.onSortColumn(oEvent, this, "customerInvoicesTable");
            },

            formatStatusState: function (status) {
                return Formatter.formatStatusState(status);
            },

            formatShippedDate: function (shippedDate, status) {
                return Formatter.formatShippedDate(shippedDate, status);
            },

            formatFax: function (value) {
                return Formatter.formatFax(value);
            },

            formatRegion: function (value) {
                return Formatter.formatRegion(value);
            },

            formatStatusText: function (status) {
                if (!status) return "";
                switch (status) {
                    case Constants.OrderStatus.SHIPPED:
                        return this.bundle.getText("shippedStatusFilter");
                    case Constants.OrderStatus.PENDING:
                        return this.bundle.getText("pendingStatusFilter");
                    case Constants.OrderStatus.DECLINED:
                        return this.bundle.getText("declinedStatusValue");
                    default:
                        return status;
                }
            },
        });
    }
);