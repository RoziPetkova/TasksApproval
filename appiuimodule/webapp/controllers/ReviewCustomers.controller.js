sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "../utils/Helper"
    ],
    function (Controller, History, Sorter, Filter, FilterOperator, MessageToast, MessageBox, Helper) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewCustomers', {
            _bundle: null,
            _sortState: {},

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            onAfterRendering: function () {
                Helper.setStickyHeader(this, "reviewCustomersTable");
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onCustomerPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("odataModel").getObject().CustomerID });
            },

            onFilterCustomers: function (oEvent) {
                Helper.onFilter(oEvent, this, "reviewCustomersTable", ["CustomerID", "CompanyName"]);
            },

            onSortCustomersColumn: function (fieldPath, columnIndex) {
                const table = this.byId("reviewCustomersTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetCustomersHeaderIcons();

                this._sortState[fieldPath] = !this._sortState[fieldPath];
                const isAscending = this._sortState[fieldPath];

                const sorter = new Sorter(fieldPath, !isAscending);
                binding.sort(sorter);

                const columns = table.getColumns();
                const column = columns[columnIndex];
                const header = column.getHeader();

                let icon = null;
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[1]) {
                        icon = headerItems[1];
                    }
                }

                if (icon && icon.getMetadata().getName() === "sap.ui.core.Icon") {
                    if (isAscending) {
                        icon.setSrc("sap-icon://sort-ascending");
                    } else {
                        icon.setSrc("sap-icon://sort-descending");
                    }
                }
            },

            _resetCustomersHeaderIcons: function () {
                const table = this.byId("reviewCustomersTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        const headerItems = header.getItems();
                        if (headerItems) {
                            headerItems.forEach(function (item) {
                                if (item.getMetadata().getName() === "sap.ui.core.Icon" &&
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://text-align-center")) {
                                    item.setSrc("sap-icon://sort");
                                }
                            });
                        }
                    }
                });
            },

            onSortCustomerId: function () {
                this.onSortCustomersColumn("CustomerID", 0);
            },

            onSortCountry: function () {
                this.onSortCustomersColumn("Country", 3);
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