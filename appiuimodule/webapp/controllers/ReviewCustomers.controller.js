sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, MessageToast, JSONModel, MessageBox) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewCustomers', {
            _bundle: null,
            _sortState: {},
            _customersSkip: 0,
            _customersHasMore: true,

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._loadCustomersModel().then(() => {
                    this._setStickyHeaderForCustomersTable();
                });
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

            _loadCustomersModel: async function () {
                var oCustomersModel = new JSONModel();
                const oTable = this.byId("reviewCustomersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    ///this hardcoded URL needs to be extracted and also the MAGIC number 20 :) 
                    //Extract it as a constants, since it is being used here and there
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=20");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    //Hard coded 'magic' number . Let's don't do this, since it is very hard to track and maintain :)
                    data.hasMore = data.value && data.value.length === 20;

                    oCustomersModel.setData(data);

                    //Hard coded 'magic' number . Let's don't do this, since it is very hard to track and maintain :)
                    this._customersSkip = 20;
                    this._customersHasMore = data.hasMore;
                } catch (error) {
                    ///Lets not hard code such errors and don't log them. If anything goes wrong in the try block, the error will be logged anyway.
                    ///Remove the console error statement.
                    console.error("Error loading customers data: ", error);
                    oCustomersModel.setData({ value: [], hasMore: false });
                    MessageBox.error(this._bundle.getText("failedToLoadCustomersMessage"));
                } finally {
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }

                this.getOwnerComponent().setModel(oCustomersModel, "customers");
            },

            onLoadMoreCustomers: async function () {
                if (!this._customersHasMore) {
                    return;
                }

                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                const currentData = oCustomersModel.getData();
                const oTable = this.byId("reviewCustomersTable");

                ////Don't do such checks, it should be imperative - if the table is not loaded, there is a bigger issue.
                ///Remove those type of checks from every method :)
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=20&$skip=${this._customersSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        this._customersSkip += newData.value.length;
                        //Hard coded 'magic' number . Let's don't do this, since it is very hard to track and maintain :)
                        this._customersHasMore = newData.value.length === 20;
                        currentData.hasMore = this._customersHasMore;

                        oCustomersModel.setData(currentData);
                    } else {
                        this._customersHasMore = false;
                        currentData.hasMore = false;
                        oCustomersModel.setData(currentData);
                    }
                } catch (error) {
                    ///Lets not hard code such errors and don't log them. If anything goes wrong in the try block, the error will be logged anyway.
                    ///Remove the console error statement.
                    console.error("Error loading more customers data: ", error);
                    this._customersHasMore = false;
                    currentData.hasMore = false;
                    oCustomersModel.setData(currentData);
                    MessageBox.error(this._bundle.getText("failedToLoadMoreCustomersMessage"));
                } finally {
                    ////Don't do such checks, it should be imperative - if the table is not loaded, there is a bigger issue.
                    ///Remove those type of checks from every method :) And it is already fetched from the DOM on line 88 
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }
            },

            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();


                ///What do you think of reworking this check as !!sPrevioushHas ?
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
                    { CustomerID: oEvent.getSource().getBindingContext("customers").getObject().CustomerID });
            },

            onFilterCustomers: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchCustomers(query);
            },

            searchCustomers: async function (query) {
                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                const oTable = this.byId("reviewCustomersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    ///Extract the base URL https://services.odata.org/V4/Northwind/Northwind.svc in Constants and replace it everywhere it is being used
                    ///If we need to do some modifications for the BASE url, we need to change in a lot of places.
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Customers";

                    if (query && query.trim()) {
                        const escapedQuery = query.replace(/'/g, "''");
                        const filter = `contains(CustomerID,'${escapedQuery}') or contains(CompanyName,'${escapedQuery}')`;
                        url += `?$filter=${encodeURIComponent(filter)}`;
                    } else {
                        //Hard coded 'magic' number in a string. Let's don't do this, since it is very hard to track and maintain :)
                        url += "?$top=20";
                    }

                    const response = await fetch(url);
                    if (!response.ok) {
                        ///This error is being repeated everywhere - HTTP error! status: . Let's extract it in constants file
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    ///Hard coded magic number 20
                    data.hasMore = data.value && data.value.length === 20;

                    oCustomersModel.setData(data);

                    this._customersSkip = data.value ? data.value.length : 0;
                    this._customersHasMore = data.hasMore;
                } catch (error) {
                    ///Lets not hard code such errors and don't log them. If anything goes wrong in the try block, the error will be logged anyway.
                    ///Remove the console error statement.
                    console.error("Error searching customers:", error);
                    MessageBox.error(this._bundle.getText("failedToSearchCustomersMessage"));
                } finally {
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }
            },

            onSortCustomersColumn(fieldPath, columnIndex) {
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

                ///What are we doing here ? Why ?
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[1]) {
                        icon = headerItems[1];
                    }
                }

                ///What are we doing here ? Why ?
                if (icon && icon.getMetadata().getName() === "sap.ui.core.Icon") {
                    if (isAscending) {
                        icon.setSrc("sap-icon://sort-ascending");
                    } else {
                        icon.setSrc("sap-icon://sort-descending");
                    }
                }
            },

            _resetCustomersHeaderIcons() {
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

            onSortCustomerId() {
                this.onSortCustomersColumn("CustomerID", 0);
            },

            onSortCountry() {
                //What is the magic number 3 doing here ?
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