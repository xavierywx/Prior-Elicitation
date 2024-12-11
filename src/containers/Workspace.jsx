import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, Backdrop, CircularProgress, InputLabel, FormControl, Tabs, Tab, Typography, MenuList, Paper, BottomNavigation, BottomNavigationAction, Tooltip } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';
import HelpIcon from '@mui/icons-material/Help';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import axios from 'axios';
import * as d3 from 'd3';

const context = {
    "human_growth_model": "During the early stages of life the stature of female and male are about the same,\
                but their stature start to clearly to differ during growth and in the later stages of life.\
                In the early stage man and female are born roughly with the same stature, around 45cm - 55cm.\
                By the time they are born reaching around 2.5 years old, both male and female present the highest growth rate (centimetres pey year).\
                It is the time they grow the fastest. During this period, man has higher growth rate compared to female.\
                For both male and female there is a spurt growth in the pre-adulthood.\
                For man, this phase shows fast growth rate varying in between 13-17 years old and female varying from 11-15.\
                Also, male tend to keep growing with roughly constant rate until the age of 17-18, while female with until the age of 15-16.\
                After this period of life they tend to stablish their statures mostly around 162 - 190cm and 155 - 178cm respectively.",
    "income_education_age": "Imagine you are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how the number of years of education and a person's age (or employment years) impact their monthly income in the U.S.\
                You aim to use this information to better understand socioeconomic patterns and inform policy recommendations.",
}

const predefinedVariables = [
    {
        name: "age",
        min: 18,
        max: 60,
        unitLabel: 'years',
        binEdges: d3.range(10 + 1).map(i => 18 + i * (60 - 18) / 10),
        counts: Array(10).fill(0),
        distributions: []
    },
    {
        name: "education_years",
        min: 0,
        max: 20,
        unitLabel: 'years',
        binEdges: d3.range(10 + 1).map(i => 0 + i * (20 - 0) / 10),
        counts: Array(10).fill(0),
        distributions: []
    },
    {
        name: "income",
        min: 0,
        max: 10000,
        unitLabel: 'USD',
        binEdges: d3.range(10 + 1).map(i => 0 + i * (10000 - 0) / 10),
        counts: Array(10).fill(0),
        distributions: []
    },
]

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const bivarRef = useRef();

    const [variablesDict, setVariablesDict] = useState({});
    const [selectedVarName, setSelectedVarName] = useState('');
    const [selectedVariable, setSelectedVariable] = useState('');
    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});
    const [entities, setEntities] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);

    const [studyContext, setStudyContext] = useState(context["human_growth_model"]);

    const updateVariable = (name, key, value) => {
        console.log("update variable", name, key, value);
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    }

    const updateBivariable = (name, key, value) => {
        console.log("update bivariable", name, key, value);
        setBiVariableDict(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    }

    const updateEntities = (newEntities) => {
        console.log("update entities", newEntities);
        if (Array.isArray(newEntities)) {
            setEntities(prev => ([...prev, ...newEntities]));
        } else {
            setEntities(prev => ([...prev, newEntities]));
        }
    }

    const handleSelectedVariableChange = (event, value) => {
        console.log("select", value)
        setSelectedVarName(value);
        setSelectedVariable(variablesDict[value]);
    };

    const selectBivariable = (biVarName) => {
        let [varName, relatedVarName] = biVarName.split("-");
        setBivariateVarName1(varName);
        setBivariateVarName2(relatedVarName);
    }

    const synchronizeSankeySelection = (selectedEntities) => {
        console.log("synchronizeSankeySelection", selectedEntities);
        bivarRef.current?.synchronizeSelection(selectedEntities);
    }

    const loadData = () => {
        

        fetch("/synthetic_dataset.json")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch the dataset");
                }
                return response.json();
            })
            .then((data) => updateEntities(data))
            .catch((error) => console.error("Error loading dataset:", error));
    }


    const translate = () => {
        console.log("translate");
        setIsTranslating(true);
        console.log("entities", entities);
        console.log("variables", Object.values(variablesDict));

        axios
            .post(window.BACKEND_ADDRESS + "/translate", {
                entities: entities,
                variables: Object.values(variablesDict),
            })
            .then((response) => {
                console.log("translated", response.data);
                plotParametersHistogram(response.data.parameter_distributions);
            })
            .finally(() => {
                setIsTranslating(false);
            });
    };

    const plotParametersHistogram = (parameterDistributions) => {
        const width = 300;
        const height = 500;
        const margin = { top: 40, right: 30, bottom: 40, left: 40 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        const offset = 100;
        document.getElementById('parameter-histogram-div').innerHTML = '';
        const container = d3.select('#parameter-histogram-div')

        Object.entries(parameterDistributions).forEach(([parameter, distribution], index) => {
            // Create an SVG element
            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('transform', `translate(${index * (width + offset)}, 0)`);

            // Append a group element to the SVG to position the chart
            const g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Set the range for x and y axes based on the data
            const x = d3.scaleLinear()
                .domain([d3.min(distribution), d3.max(distribution)])
                .nice()
                .range([0, plotWidth]);

            const bins = d3.bin()
                .domain(x.domain())
                .thresholds(x.ticks(20))(distribution);

            const y = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)])
                .nice()
                .range([plotHeight, 0]);

            // Create the x-axis
            g.append('g')
                .attr('transform', `translate(0,${plotHeight})`)
                .call(d3.axisBottom(x));

            // Create the y-axis
            g.append('g')
                .call(d3.axisLeft(y));

            // Add bars for the histogram
            g.selectAll('.bar')
                .data(bins)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d.x0))
                .attr('width', d => x(d.x1) - x(d.x0) - 1) // Adjust width for padding
                .attr('y', d => y(d.length))
                .attr('height', d => plotHeight - y(d.length))
                .attr('fill', '#69b3a2');

            // Add title to each histogram
            g.append('text')
                .attr('x', plotWidth / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text(parameter);
        });
    }

    return (
        <div className='workspace-div'>
            <Box className="module-div" sx={{ width: "100%", my: 2 }}>
                <h3>Analysis Context</h3>
                <Typography>
                    {studyContext}
                </Typography>
                {/* <Typography sx={{my: 1, fontWeight: 'bold'}}>
                    Please provide the distribution for statures of males.
                    Please provide the distributuion for monthly income.
                </Typography> */}
            </Box>

            <ConceptualModel
                variablesDict={variablesDict}
                setVariablesDict={setVariablesDict}
                biVariableDict={biVariableDict}
                setBiVariableDict={setBiVariableDict}
                updateVariable={updateVariable}
                updateBivariable={updateBivariable}
                selectBivariable={selectBivariable}
            />

            <Box className="module-div" sx={{ width: "100%", my: 2 }}>
                <h3>Parallel Sankey Plot</h3>
                <Button onClick={loadData}>Load Data</Button>
                <Button onClick={translate}>Translate</Button>
                <ParallelSankeyPlot
                    variablesDict={variablesDict}
                    updateVariable={updateVariable}
                    entities={entities}
                    updateEntities={updateEntities}
                    synchronizeSankeySelection={synchronizeSankeySelection}
                />
            </Box>

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={isTranslating}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            <Grid2 sx={{ my: 2 }} container spacing={3}>
                <Grid2 className="module-div" size={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>
                            Bivariate Relationship
                            <Tooltip
                                title={
                                    <React.Fragment>
                                        <b>{'Predict Mode'}</b>: {'Draw a trending line.'}<br />
                                        <b>{'Populate Mode'}</b>: {'Adding data points.\n'}<br />
                                        <b>{'Chip Mode'}</b>: {'Combine marginal data points.\n'}<br />
                                        <br />
                                        <b>{'Click'}</b> {'to add a point or '} <b>{'Double Click'}</b> {'to delete a point.'}
                                    </React.Fragment>
                                }>
                                <HelpIcon fontSize="small" style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                            </Tooltip>
                        </h3>

                        {bivariateVarName1 !== '' && bivariateVarName2 !== '' ?
                            <BiVariablePlot
                                ref={bivarRef}
                                biVariableDict={biVariableDict}
                                biVariable1={variablesDict[bivariateVarName1]}
                                biVariable2={variablesDict[bivariateVarName2]}
                                updateVariable={updateVariable}
                                updateBivariable={updateBivariable}
                                entities={entities}
                            />
                            :
                            <></>}
                    </Box>
                </Grid2>

                <Grid2 size={6}>
                    <Box className="module-div" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>Univariate Distributions</h3>
                        <Tabs
                            value={selectedVarName}
                            onChange={handleSelectedVariableChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ my: 2 }}
                        >
                            {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                return (
                                    <Tab key={i} label={varName} value={varName} />
                                )
                            })}
                        </Tabs>
                        {Object.entries(variablesDict).map(([varName, curVar], i) => {
                            return (
                                <Box key={varName} sx={{ width: '100%', height: '100%' }}>
                                    {selectedVarName === varName ?
                                        <VariablePlot variable={curVar} updateVariable={updateVariable} entities={entities} />
                                        :
                                        <></>
                                    }
                                </Box>
                            )
                        })}
                    </Box>
                </Grid2>
            </Grid2>

            <Grid2 sx={{ my: 2 }} container spacing={3}>
                <Box className="module-div" sx={{ width: "100%", my: 2 }}>
                    <div id='parameter-histogram-div'>
                    </div>
                </Box>
            </Grid2>
        </div>
    );
};
