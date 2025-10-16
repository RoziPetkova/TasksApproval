sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageToast",
        "sap/m/MessageBox"
    ],
    function (Controller, History, Sorter, Filter, FilterOperator, MessageToast, MessageBox) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewCustomers', {
            _bundle: null,
            _sortState: {},

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            onAfterRendering: function () {
                this._setStickyHeaderForCustomersTable();
            },

            _setStickyHeaderForCustomersTable: function() {
                sap.ui.require([
                    "sap/m/library"
                ], function(mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;
                    
                    const oCustomersTable = this.byId("reviewCustomersTable");
                    if (oCustomersTable) {
                        oCustomersTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },


            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            onCustomerPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("odataModel").getObject().CustomerID });
            },

            onFilterCustomers: function (oEvent) {
                const sQuery = oEvent.getParameter("query");
                const oTable = this.byId("reviewCustomersTable");
                //take the binding object - the link between table content and data
                const oBinding = oTable.getBinding("items");

                if (sQuery && sQuery.trim()) {
                    const oFilter = new Filter({
                        filters: [
                            new Filter("CustomerID", FilterOperator.Contains, sQuery),
                            new Filter("CompanyName", FilterOperator.Contains, sQuery)
                        ],
                        and: false
                    });
                    //"Application"	Your app’s logical/user filters (search, select, etc.)
                    //"Control"	Filters applied by SAPUI5 controls internally
                    oBinding.filter(oFilter, "Application");
                } else {
                    oBinding.filter([], "Application");
                }
            },

            onSortCustomersColumn: function(fieldPath, columnIndex) {
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

            _resetCustomersHeaderIcons: function() {
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

            onSortCustomerId: function() {
                this.onSortCustomersColumn("CustomerID", 0);
            },

            onSortCountry: function() {
                this.onSortCustomersColumn("Country", 3);
            },

            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();
            },

            onLogoutPress: async function() {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
            },

            onSettingsSave: function() {
                MessageToast.show(this._bundle.getText("settingsSavedMessage"));
                this.settingsDialog.close();
            },

            onCloseDialog: function() {
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutConfirm: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
            },
        });
    }
);