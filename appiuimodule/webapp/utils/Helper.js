sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/m/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (MessageToast, History, mobileLibrary, Filter, FilterOperator, Sorter) {
    "use strict";

    return {
        setStickyHeader: function (oController, sTableId) {
            const Sticky = mobileLibrary.Sticky;
            const oTable = oController.byId(sTableId);
            if (oTable) {
                oTable.setSticky([Sticky.ColumnHeaders]);
            }
        },

        onNavBack: function (oController, defaultRoute) {
            const oHistory = History.getInstance();
            const sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                const oRouter = oController.getOwnerComponent().getRouter();
                oRouter.navTo(defaultRoute || "overview", {}, true);
            }
        },
        onSettingsPress: async function (oController) {
            if (!oController.settingsDialog) {
                oController.settingsDialog = await oController.loadFragment({
                    name: "appiuimodule.views.SettingsDialog"
                });
            }
            oController.settingsDialog.open();
        },

        onLogoutPress: async function (oController) {
            if (!oController.logoutDialog) {
                oController.logoutDialog = await oController.loadFragment({
                    name: "appiuimodule.views.LogoutDialog"
                });
            }
            oController.logoutDialog.open();
        },

        onSettingsSave: function (oController) {
            const bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
            MessageToast.show(bundle.getText("settingsSavedMessage"));
            oController.settingsDialog.close();
        },

        onCloseDialog: function (oController) {
            if (oController.settingsDialog && oController.settingsDialog.isOpen()) {
                oController.settingsDialog.close();
            }
            if (oController.logoutDialog && oController.logoutDialog.isOpen()) {
                oController.logoutDialog.close();
            }
            if (oController.approveDialog && oController.approveDialog.isOpen()) {
                oController.approveDialog.close();
            }
            if (oController.declineDialog && oController.declineDialog.isOpen()) {
                oController.declineDialog.close();
            }
        },

        onLogoutConfirm: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("logout");
            oController.logoutDialog.close();
        },

        onHomepagePress: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("entrypanel");
        },

        onHomePress: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("overview");
        },

        onFilter: function (oEvent, oController, sTableId, aFieldNames) {
            const sQuery = oEvent.getParameter("query");
            const oTable = oController.byId(sTableId);
            const oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim()) {
                const aFilters = aFieldNames.map(function(sFieldName) {
                    return new Filter(sFieldName.trim(), FilterOperator.Contains, sQuery);
                });

                const oFilter = new Filter({
                    filters: aFilters,
                    and: false
                });
                oBinding.filter(oFilter, "Application");
            } else {
                oBinding.filter([], "Application");
            }
        },

        onSortColumn: function (oEvent, oController, sTableId) {
            const oControl = oEvent.getSource();
            const oColumn = oControl.getParent();
            const sFieldPath = oColumn.data("fieldPath");
            const oTable = oController.byId(sTableId);
            const oBinding = oTable.getBinding("items");

            const initialSortOrder = oColumn.getSortIndicator();

            oTable.getColumns().forEach(function (col) {
                col.setSortIndicator("None");
            });

            // new Sort order
            let bDescending = false;
            let sNewSortIndicator = "Ascending";

            if (initialSortOrder === "Ascending") {
                bDescending = true;
                sNewSortIndicator = "Descending";
            } else if (initialSortOrder === "Descending") {
                bDescending = false;
                sNewSortIndicator = "Ascending";
            }

            // Set sort indicator on clicked column
            oColumn.setSortIndicator(sNewSortIndicator);

            // Apply sort to binding
            const oSorter = new Sorter(sFieldPath, bDescending);
            oBinding.sort(oSorter);
        },

        /**
         * Generic sort function for table columns with sort indicator (JSON model)
         * @param {sap.ui.base.Event} oEvent - The press event from Link/Button
         * @param {sap.ui.core.mvc.Controller} oController - The controller instance
         * @param {string} sTableId - The ID of the table to sort
         * @param {string} sModelName - The name of the JSON model
         * @param {string} sDataPath - The path to the data array in the model (e.g., "/value")
         */
        onSortColumnJSON: function (oEvent, oController, sTableId, sModelName, sDataPath) {
            const oControl = oEvent.getSource();
            const oColumn = oControl.getParent();
            const sFieldPath = oColumn.data("fieldPath");
            const oTable = oController.byId(sTableId);
            const oModel = oController.getOwnerComponent().getModel(sModelName);

            const initialSortOrder = oColumn.getSortIndicator();

            // Reset all columns' sort indicators
            oTable.getColumns().forEach(function (col) {
                col.setSortIndicator("None");
            });

            // Determine new sort order
            let sNewSortIndicator = "Ascending";

            if (initialSortOrder === "Ascending") {
                sNewSortIndicator = "Descending";
            } else if (initialSortOrder === "Descending") {
                sNewSortIndicator = "Ascending";
            }

            // Set sort indicator on clicked column
            oColumn.setSortIndicator(sNewSortIndicator);

            // Get data array from model
            const aData = oModel.getProperty(sDataPath);

            if (aData && aData.length > 0) {
                // Sort the data array
                aData.sort(function (a, b) {
                    const valueA = a[sFieldPath];
                    const valueB = b[sFieldPath];

                    // Handle null/undefined values
                    if (valueA == null && valueB == null) return 0;
                    if (valueA == null) return sNewSortIndicator === "Ascending" ? 1 : -1;
                    if (valueB == null) return sNewSortIndicator === "Ascending" ? -1 : 1;

                    // Compare values
                    let comparison = 0;
                    if (typeof valueA === "string" && typeof valueB === "string") {
                        comparison = valueA.localeCompare(valueB);
                    } else {
                        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                    }

                    return sNewSortIndicator === "Ascending" ? comparison : -comparison;
                });

                // Update model with sorted data
                oModel.setProperty(sDataPath, aData);
            }
        }
    };
});
