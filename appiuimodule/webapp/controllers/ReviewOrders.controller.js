sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "../utils/Formatter",
        "../utils/Helper",
        "../utils/Constants"
    ],
    function (Controller, Formatter, Helper, Constants) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewOrders', {
            formatter: Formatter,
            _bundle: null,
            _originalOrdersData: null,

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatStatusState: function (status) {
                return Formatter.formatStatusState(status);
            },

            formatShippedDate: function (shippedDate, status) {
                return Formatter.formatShippedDate(shippedDate, status);
            },

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                Helper.setStickyHeader(this, "reviewOrdersTable");

                // Initialize _originalOrdersData from existing model
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                if (oOrdersModel && oOrdersModel.getData()) {
                    this._originalOrdersData = oOrdersModel.getData();
                }
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onOrderPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails",
                    { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
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
                        console.warn("Orders data not available for status filtering");
                        return;
                    }
                }

                const allOrders = this._originalOrdersData || [];
                let filteredOrders;

                if (status === Constants.OrderStatus.SHIPPED) {
                    filteredOrders = allOrders.filter(function (order) {
                        return order.Status === Constants.OrderStatus.SHIPPED;
                    });
                } else if (status === Constants.OrderStatus.PENDING) {
                    filteredOrders = allOrders.filter(function (order) {
                        return order.Status === Constants.OrderStatus.PENDING;
                    });
                } else {
                    filteredOrders = allOrders;
                }

                oOrdersModel.setData(filteredOrders);
            },

            onSortColumn: function (oEvent) {
                Helper.onSortColumnJSON(oEvent, this, "reviewOrdersTable", "orders", "/");
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
        });
    }
);