const ETIOLOGIES = {
  SBS1: "Clock-like",
  SBS2: "APOBEC",
  SBS3: "HR-deficiency",
  SBS4: "Tobacco",
  SBS5: "Clock-like",
  SBS6: "MMR-deficiency",
  SBS7a: "UV",
  SBS7b: "UV",
  SBS7c: "UV",
  SBS7d: "UV",
  SBS9: "POLH",
  SBS10a: "POLE",
  SBS10b: "POLE",
  SBS11: "Temozolomide",
  SBS13: "APOBEC",
  SBS14: "POLE",
  SBS15: "MMR-deficiency",
  SBS18: "ROS",
  SBS20: "MMR-deficiency",
  SBS21: "MMR-deficiency",
  SBS22: "Aristolochic acid",
  SBS24: "Aflatoxin",
  SBS26: "MMR-deficiency",
  SBS29: "Tobacco",
  SBS30: "NTHL1",
  SBS31: "Platinum-therapy",
  SBS32: "Azathioprine",
  SBS35: "Platinum-therapy",
  SBS36: "MUTYH",
  SBS38: "UV",
  SBS42: "Haloalkanes",
  SBS44: "MMR-deficiency",
  SBS84: "AID",
  SBS85: "AID",
  SBS86: "Chemotherapy",
  SBS87: "Thiopurine",
  SBS88: "E. Coli",
  SBS90: "Duocarmycin",
};

const COSMIC_SBS_BASE_URL = "https://cancer.sanger.ac.uk/signatures/sbs";

const OTHER_CATEGORY_THRESHOLD = 0.01; // [0.0, 1.0]

const state = {
  activeCohort: "Query",
  diseaseName: "",
  data: {
    signatures: [],
    reference: [],
    query: [],
  },
};

const colors = Plotly.d3.scale.category20();

const formatSnv = (count) => {
  if (count === 1) {
    return `${count} SNV`;
  } else {
    return `${count} SNVs`;
  }
};

const populateDiseases = () => {
  let uniqueDiseases = {};

  for (let sample of state.data.reference) {
    uniqueDiseases[sample.disease.name] = sample.disease.name;
  }

  let names = Object.keys(uniqueDiseases);
  names.sort();

  const $plot = document.getElementById("plot");

  for (let name of names) {
    $plot.add(new Option(name, uniqueDiseases[name]));
  }

  state.diseaseName = uniqueDiseases[names[0]];
};

const addEventListeners = () => {
  document.getElementById("plot").addEventListener("change", (event) => {
    state.diseaseName = event.target.value;
    render();
  });
};

const loadData = () => {
  const payload = document.getElementById("payload").innerText;
  state.data = JSON.parse(payload).data;
};

const buildReferenceSignatureTraces = (
  signatures,
  samples,
  diseaseName,
  isActive
) => {
  const totals = new Array(signatures.length).fill(0);

  for (let sample of samples) {
    for (let i = 0; i < sample.contributions.length; i++) {
      totals[i] += sample.contributions[i];
    }
  }

  const total = totals.reduce((sum, value) => sum + value, 0);
  const threshold = total * OTHER_CATEGORY_THRESHOLD;

  let title = `Reference<br>${diseaseName} (n=${samples.length})`;
  let line = { width: 0 };

  if (isActive) {
    title = `<b>${title}</b>`;
    line.width = 2;
  }

  let otherValue = 0.0;

  const traces = [];

  for (let i = 0; i < signatures.length; i++) {
    let isOther = false;

    if (totals[i] === 0) {
      continue;
    }

    if (totals[i] < threshold) {
      otherValue += totals[i];
      isOther = true;
    }

    const name = signatures[i];
    const etiology = ETIOLOGIES[name] ? `<br>${ETIOLOGIES[name]}` : "";

    const trace = {
      x: [totals[i] / total],
      y: [title],
      xaxis: "x",
      yaxis: "y",
      name: `<b>${name}</b>${etiology}`,
      text: [`${formatSnv(totals[i])}<br>${name}${etiology}`],
      hoverinfo: "text",
      orientation: "h",
      type: "bar",
      showlegend: false,
      visible: !isOther,
      marker: {
        color: colors(i),
        line,
      },
    };

    traces.push(trace);
  }

  if (otherValue > 0) {
    const otherTrace = {
      x: [otherValue / total],
      y: [title],
      xaxis: "x",
      yaxis: "y",
      name: "<b>Other</b>",
      text: [`${formatSnv(otherValue)}<br>Other`],
      hoverinfo: "text",
      orientation: "h",
      type: "bar",
      marker: {
        color: "#222",
        line,
      },
    };

    traces.push(otherTrace);
  }

  return traces;
};

const buildQuerySignatureTraces = (signatures, samples, isActive) => {
  const totals = new Array(signatures.length).fill(0);

  for (let sample of samples) {
    for (let i = 0; i < sample.contributions.length; i++) {
      totals[i] += sample.contributions[i];
    }
  }

  const total = totals.reduce((sum, value) => sum + value, 0);

  let title = `Query<br>(n=${samples.length})`;
  let line = { width: 0 };

  if (isActive) {
    title = `<b>${title}</b>`;
    line.width = 2;
  }

  return signatures
    .map((name, i) => {
      let etiology = ETIOLOGIES[name] ? `<br>${ETIOLOGIES[name]}` : "";

      return {
        x: [totals[i] / total],
        y: [title],
        xaxis: "x2",
        yaxis: "y2",
        name: `<b>${name}</b>${etiology}`,
        text: [`${formatSnv(totals[i])}<br>${name}${etiology}`],
        hoverinfo: "text",
        orientation: "h",
        type: "bar",
        showlegend: false,
        marker: {
          color: colors(i),
          line,
        },
      };
    })
    .filter((trace) => !trace.x.every((value) => value == 0.0));
};

const buildSampleTraces = (signatures, samples, activeSignatures) => {
  samples = samples.map((sample) => ({
    sample,
    total: sample.contributions.reduce((sum, value) => sum + value, 0),
  }));

  samples.sort((a, b) => a.total - b.total);

  const sampleNames = samples.map(({ sample }) => sample.name);

  const traces = signatures
    .map((name, i) => {
      let etiology = ETIOLOGIES[name] ? `<br>${ETIOLOGIES[name]}` : "";

      return {
        x: samples.map(
          ({ sample }, j) => sample.contributions[i] / samples[j].total
        ),
        y: sampleNames,
        xaxis: "x3",
        yaxis: "y3",
        name: `<b>${name}</b>${etiology}`,
        text: samples.map(
          ({ sample }) =>
            `${formatSnv(sample.contributions[i])}<br>${name}${etiology}`
        ),
        hoverinfo: "text",
        orientation: "h",
        type: "bar",
        marker: {
          color: colors(i),
        },
      };
    })
    .filter((trace) => activeSignatures.has(trace.name));

  let contributionsTrace = {
    x: samples.map(({ total }) => total),
    y: sampleNames,
    xaxis: "x4",
    yaxis: "y4",
    text: samples.map((e) => `${formatSnv(e.total)}<br>${e.sample.name}`),
    hoverinfo: "text",
    orientation: "h",
    type: "bar",
    showlegend: false,
    marker: {
      color: "#911938",
    },
  };

  traces.push(contributionsTrace);

  return traces;
};

const render = () => {
  const {
    data: { query: querySamples, reference: referenceSamples, signatures },
    diseaseName,
  } = state;

  const filteredReferenceSamples = referenceSamples.filter(
    (sample) => sample.disease.name === diseaseName
  );

  const referenceSignatureTraces = buildReferenceSignatureTraces(
    signatures,
    filteredReferenceSamples,
    diseaseName,
    state.activeCohort === "Reference"
  );

  const querySignatureTraces = buildQuerySignatureTraces(
    signatures,
    querySamples,
    state.activeCohort === "Query"
  );

  let activeSignatures = new Set();

  for (let traces of [referenceSignatureTraces, querySignatureTraces]) {
    for (let trace of traces) {
      activeSignatures.add(trace.name);
    }
  }

  let samples =
    state.activeCohort === "Reference"
      ? filteredReferenceSamples
      : querySamples;

  const sampleTraces = buildSampleTraces(signatures, samples, activeSignatures);

  const data = [
    ...querySignatureTraces,
    ...sampleTraces,
    ...referenceSignatureTraces,
  ];

  renderChart(data);
};

const renderChart = (data) => {
  // +----------+------+
  // | xy       |      |
  // +----------+------+
  // | x2y2     |      |
  // +----------+------+
  // | x3y3     | x4y4 |
  // +----------+------+
  const layout = {
    margin: {
      t: 40,
    },
    barmode: "stack",
    hovermode: "closest",
    annotations: [
      {
        text: "Cohort Signature Contribution Means",
        xref: "paper",
        yref: "paper",
        xanchor: "center",
        yanchor: "bottom",
        x: 0.45,
        y: 1.01,
        showarrow: false,
        font: {
          size: 14,
        },
      },
      {
        text: "Sample Signature Contributions",
        xref: "paper",
        yref: "paper",
        xanchor: "center",
        yanchor: "bottom",
        x: 0.45,
        y: 0.71,
        showarrow: false,
        font: {
          size: 14,
        },
      },
      {
        text: "Sample Signature Activities",
        xref: "paper",
        yref: "paper",
        xanchor: "center",
        yanchor: "bottom",
        x: 0.95,
        y: 0.71,
        showarrow: false,
        font: {
          size: 14,
        },
      },
    ],
    legend: {
      orientation: "h",
      traceorder: "normal",
      valign: "top",
    },
    xaxis: {
      anchor: "y",
      domain: [0.0, 0.9],
      showticklabels: false,
    },
    yaxis: {
      anchor: "x",
      domain: [0.9, 1.0],
      ticklen: 8,
      automargin: true,
    },
    xaxis2: {
      anchor: "y2",
      domain: [0.0, 0.9],
    },
    yaxis2: {
      anchor: "x2",
      domain: [0.8, 0.9],
      ticklen: 8,
    },
    xaxis3: {
      anchor: "y3",
      domain: [0.0, 0.9],
      title: "Proportion of SNVs",
    },
    yaxis3: {
      anchor: "x3",
      domain: [0.0, 0.7],
      ticklen: 8,
      automargin: true,
    },
    xaxis4: {
      anchor: "y4",
      domain: [0.9, 1.0],
      title: "Total Mutational Burden",
    },
    yaxis4: {
      anchor: "x4",
      domain: [0.0, 0.7],
      showticklabels: false,
    },
  };

  const config = {
    responsive: true,
    toImageButtonOptions: {
      format: "svg",
    },
  };

  const $chart = document.getElementById("chart");
  Plotly.newPlot($chart, data, layout, config);

  $chart.on("plotly_legendclick", (ev) => {
    const { curveNumber: i, data } = ev;
    const { name } = data[i];

    const matches = name.match(/<b>(SBS.+)<\/b>/);

    if (!matches) {
      return false;
    }

    const signature = matches[1];

    const url = `${COSMIC_SBS_BASE_URL}/${signature.toLowerCase()}/`;
    window.open(url, "_blank");

    return false;
  });

  $chart.on("plotly_afterplot", () => {
    $labels = document.querySelectorAll(
      ".subplot.xy g.ytick, .subplot.x2y2 g.y2tick"
    );

    for (let $label of $labels) {
      $label.addEventListener("click", (ev) => {
        $text = ev.target.closest("text");
        $line = $text.firstChild;
        state.activeCohort = $line.textContent;
        render();
        return false;
      });
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  populateDiseases();
  addEventListeners();
  render();
});
