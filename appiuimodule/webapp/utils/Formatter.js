sap.ui.define([], function () {
    "use strict";

    return {
        formatDate: function (dateString) {
            if (!dateString) return "";
            var date = new Date(dateString);
            return date.toLocaleDateString();
        },

        formatStatusState: function (status) {
            switch (status) {
                case "Shipped":
                case "Approved":
                    return "Success";
                case "Pending":
                    return "Warning";
                case "Declined":
                case "Rejected":
                    return "Error";
                default:
                    return "None";
            }
        },

        formatShippedDate: function (shippedDate, status) {
            if (status === "Declined") {
                return "None";
            }
            if (!shippedDate) return "";
            var date = new Date(shippedDate);
            return date.toLocaleDateString();
        },

        formatCurrency: function (value) {
            if (!value) return "0.00";
            return parseFloat(value).toFixed(2);
        },

        formatDiscount: function (value) {
            if (!value || value === 0) return "0%";
            return (value * 100).toFixed(0) + "%";
        },

        formatFax: function (value) {
            return value || "N/A";
        },

        formatRegion: function (value) {
            return value || "N/A";
        }
    };
});
