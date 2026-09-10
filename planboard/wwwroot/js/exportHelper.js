window.exportHelper = {
    downloadExcel(filename, rows, absenceRows) {
        const ws = XLSX.utils.json_to_sheet(rows);
        if (absenceRows && absenceRows.length) {
            XLSX.utils.sheet_add_aoa(
                ws,
                [[], ["Afmeldingen"], ["Naam", "Type", "Van", "Tot"], ...absenceRows],
                { origin: -1 }
            );
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Geschiedenis");
        XLSX.writeFile(wb, filename);
    },
    async copyToClipboard(text) {
        await navigator.clipboard.writeText(text);
    }
};
