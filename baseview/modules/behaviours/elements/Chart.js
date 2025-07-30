export default class ChartElement {

    constructor(api, aiSettings = { model: 'gpt-4o', provider: 'openAi', integration: 'openAi' }) {
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
        const lines = tsvString.trim().split('\n');
        const headers = lines[0].split('\t');

        const result = {
            labels: [],
            datasets: []
        };

        // Start from index 1 if headers[0] is empty, indicating the first column is labels
        const headerStartIndex = headers[0] === '' ? 1 : 0;

        for (let i = headerStartIndex; i < headers.length; i++) {
            result.datasets.push({
                label: headers[i],
                data: []
            });
        }

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            result.labels.push(values[0]);

            for (let j = 1; j < values.length; j++) {
                const cleanedValue = values[j].replace(/\s+/g, '');
                result.datasets[j - 1].data.push(parseFloat(cleanedValue));
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
