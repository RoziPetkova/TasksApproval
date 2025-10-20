sap.ui.define([
    'sap/ui/core/mvc/Controller',
    "sap/ui/model/json/JSONModel",
    "../utils/Formatter",
    "../utils/Helper"
], function (Controller, JSONModel, Formatter, Helper) {

    'use strict';

    return Controller.extend('appiuimodule.controllers.Overview', {
        formatter: Formatter,
        _bundle: null,
        _router: null,
        _originalOrdersData: null,

        onInit: function () {
            this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this._router = this.getOwnerComponent().getRouter();

            this._loadAllOrders();
        },

        onAfterRendering: function () {
            Helper.setStickyHeader(this, "customersTable");
            Helper.setStickyHeader(this, "ordersTable");
            Helper.setStickyHeader(this, "invoicesTable");
        },

        onLoadMoreCustomers: function () {
            this._router.navTo("reviewcustomers");
        },

        onLoadMoreOrders: function () {
            this._router.navTo("revieworders");
        },

        onLoadMoreInvoices: function () {
            this._router.navTo("reviewinvoices");
        },

        _loadAllOrders: function () {
            const oOrdersTable = this.byId("ordersTable");
            oOrdersTable.setBusy(true);

            const oODataModel = this.getOwnerComponent().getModel("odataModel");

            oODataModel.read("/Orders", {
                success: (data) => {
                    this.handleStatusProperty(data.results);
                    this._originalOrdersData = data.results;

                    const oOrdersModel = new JSONModel(data.results);
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");

                    oOrdersTable.setBusy(false);
                },
                error: (error) => {
                    console.error("Error:", error);
                    oOrdersTable.setBusy(false);
                }
            });
        },

        handleStatusProperty(data) {
            data.forEach(function (order) {
                if (order.OrderID % 2 == 0) {
                    order.ShippedDate = null;
                }
                //extract in constant
                order.Status = order.ShippedDate ? "Shipped" : "Pending";
            });
        },

        onOrderPress(oEvent) {
            this._router.navTo("orderdetails",
                { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
        },

        onCustomerPress(oEvent) {
            this._router.navTo("customerdetails",
                { CustomerID: oEvent.getSource().getBindingContext("odataModel").getObject().CustomerID });
        },

        onInvoicePress: function (oEvent) {
            const oInvoice = oEvent.getSource().getBindingContext("odataModel").getObject();
            this._router.navTo("invoicedetails", {
                OrderID: oInvoice.OrderID
            });
        },

        onFilterOrders: function (oEvent) {
            const query = oEvent.getParameter("query");
            this.searchOrders(query);
        },

        searchOrders: function (query) {
            const oOrdersModel = this.getOwnerComponent().getModel("orders");

            if (!this._originalOrdersData) {
                if (oOrdersModel && oOrdersModel.getData()) {
                    this._originalOrdersData = oOrdersModel.getData();
                } else {
                    console.warn("Orders data not available for search");
                    return;
                }
            }

            const allOrders = this._originalOrdersData || [];
            let filteredOrders;

            if (query && query.trim()) {
                const queryLower = query.toLowerCase();
                filteredOrders = allOrders.filter(function (order) {
                    return order.CustomerID.toLowerCase().includes(queryLower);
                });
            } else {
                filteredOrders = allOrders;
            }

            oOrdersModel.setData(filteredOrders);
        },

        onStatusFilterChange: function (oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem").getKey();
            this.filterOrdersByStatus(selectedKey);
        },

        filterOrdersByStatus: function (status) {
            const oOrdersModel = this.getOwnerComponent().getModel("orders");

            if (!this._originalOrdersData) {
                if (oOrdersModel && oOrdersModel.getData()) {
                    this._originalOrdersData = oOrdersModel.getData();
                } else {

                    //mess box
                    console.warn("Orders data not available for status filtering");
                    return;
                }
            }

            const allOrders = this._originalOrdersData || [];
            let filteredOrders;

            if (status === "Shipped") {
                filteredOrders = allOrders.filter(function (order) {
                    return order.Status === "Shipped";
                });
            } else if (status === "Pending") {
                filteredOrders = allOrders.filter(function (order) {
                    return order.Status === "Pending";
                });
            } else {
                filteredOrders = allOrders;
            }

            oOrdersModel.setData(filteredOrders);
        },

        onFilter: function (oEvent) {
            const oSearchField = oEvent.getSource();
            const sTableId = oSearchField.data("tableId");
            const aFieldNames = oSearchField.data("filterFields").split(",");

            Helper.onFilter(oEvent, this, sTableId, aFieldNames);
        },

        onSortCustomersColumn: function (oEvent) {
            Helper.onSortColumn(oEvent, this, "customersTable");
        },

        onSortInvoicesColumn: function (oEvent) {
            Helper.onSortColumn(oEvent, this, "invoicesTable");
        },

        onSortOrdersColumn: function (oEvent) {
            Helper.onSortColumnJSON(oEvent, this, "ordersTable", "orders", "/");
        },

        formatDate: function (dateString) {
            return Formatter.formatDate(dateString);
        },

        formatStatusState: function (status) {
            return Formatter.formatStatusState(status);
        },

        formatShippedDate: function (shippedDate, status) {
            return Formatter.formatShippedDate(shippedDate, status);
        },

        formatCurrency: function (value) {
            return Formatter.formatCurrency(value);
        },

        onSettingsPress: async function () {
            await Helper.onSettingsPress(this);
        },

        onLogoutPress: async function () {
            await Helper.onLogoutPress(this);
        },

        onSettingsSave: function () {
            Helper.onSettingsSave(this);
        },

        onCloseDialog: function () {
            Helper.onCloseDialog(this);
        },

        onLogoutConfirm: function () {
            Helper.onLogoutConfirm(this);
        },

        onHomepagePress: function () {
            Helper.onHomepagePress(this);
        },

        onNavBack: function () {
            Helper.onNavBack(this, "entrypanel");
        },
    });
});