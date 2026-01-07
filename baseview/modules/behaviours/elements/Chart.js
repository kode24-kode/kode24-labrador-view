export default class ChartElement {

    constructor(api, aiSettings = {
        model: 'gpt-4o', provider: 'openAi', integration: 'openAi', featureName: 'chart'
    }) {
        this.api = api;
        this.aiSettings = aiSettings;   // Settings for the ai-integration (model, provider, integration)
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.requiredFilesJS = this.api.v1.config.get('contentbox_settings.chart.require.js') || null;

        if (this.isEditor) {

            this.api.v1.ns.set('chart', {
                generate: (model, view) => {
                    const bodyText = this.api.v1.bodytext.getText(this.api.v1.model.query.getModelByType('bodytext'));
                    const domElement = view.getMarkup();
                    domElement.classList.add('lab-content-busy');
                    this.api.v1.ns.get('textAssistant.fetchByGroupName')('chart', this.aiSettings, { bodytext: bodyText })
                        .then((response) => {
                            if (response) {
                                const data = this.cleanUpAndParseJsonString(response);
                                const {
                                    enoughData, title, type, beginAtZero, labels, datasets
                                } = data;
                                if (enoughData) {
                                    this.setIfDefined(model, 'fields.title', title);
                                    this.setIfDefined(model, 'fields.chartType', type);
                                    this.setIfDefined(model, 'fields.beginAtZero', beginAtZero);
                                    this.setIfDefined(model, 'fields.tableData', this.objectToTsv({ labels, datasets }));
                                } else {
                                    domElement.classList.add('lab-highlight-warn');
                                    domElement.querySelector('.description').insertAdjacentHTML('afterend', '<p style="color: #ff0000; text-transform: uppercase; font-weight: bold;">Not enough data to generate a chart</p>');
                                }
                            }
                        })
                        .finally(() => {
                            domElement.classList.remove('lab-content-busy');
                        });
                }
            });
        }
    }

    onCreated(model) {
        if (this.requiredFilesJS) {
            this.requiredFilesJS.forEach((file) => {
                for (const doc of this.api.v1.viewport.getContexts()) {
                    this.api.v1.util.dom.addFile('js', file, doc, null, null, {}, false);
                }
            });
        }
    }

    onRender(model, view) {
        const chartType = model.get('fields.chartType') || 'line';
        const beginAtZero = model.get('fields.beginAtZero') || false;
        const tableData = model.get('fields.tableData');
        let chartData;
        if (tableData) {
            chartData = this.tsvToObject(tableData);
        }

        model.setFiltered('chartType', chartType);
        model.setFiltered('beginAtZero', beginAtZero);
        model.setFiltered('chartData_json', JSON.stringify(chartData));
    }

    tsvToObject(tsvString) {
        const normalized = (tsvString === undefined || tsvString === null) ? "" : String(tsvString).replace(/\r\n?/g, "\n").trim();
        if (!normalized) return { labels: [], datasets: [] };
        
        const lines = normalized.split("\n").filter(l => l.trim() !== "");
        const headerCells = lines[0].split('\t');
        const datasetHeaders = headerCells.slice(1);

        const result = {
            labels: [],
            datasets: datasetHeaders.map(h => ({ label: ((h === null || h === undefined) ? "" : h).trim(), data: [] })),
        };
        
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split("\t");
            result.labels.push(((cells[0] === null || cells[0] === undefined) ? "" : cells[0]).trim());
            
            for (let d = 0; d < result.datasets.length; d++) {
                const raw = ((cells[d + 1] === null || cells[d + 1] === undefined) ? "" : cells[d + 1]).trim();
                const num = raw === "" ? null : Number(raw.replace(/\s+/g, ""));
                
                result.datasets[d].data.push(Number.isFinite(num) ? num : null);
            }
        }

        return result;
    }

    objectToTsv(obj) {
        const headers = [''].concat(obj.datasets.map((dataset) => dataset.label));
        const rows = [headers.join('\t')];

        for (let i = 0; i < obj.labels.length; i++) {
            const row = [obj.labels[i]];
            for (let j = 0; j < obj.datasets.length; j++) {
                row.push(obj.datasets[j].data[i]);
            }
            rows.push(row.join('\t'));
        }

        return rows.join('\n');
    }

    cleanUpAndParseJsonString(response) {
        try {
            // Remove any leading or trailing unwanted characters
            const cleanedResponse = response.trim();

            // Remove the leading '```json' and trailing '```'
            const jsonString = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');

            // Parse the cleaned JSON string
            const parsedData = JSON.parse(jsonString);

            return parsedData;
        } catch (error) {
            console.error('Error cleaning or parsing API response:', error.message);
            return null;
        }
    }

    setIfDefined(model, key, value) {
        if (value !== undefined && value !== null) {
            model.set(key, value);
        }
    }

}
