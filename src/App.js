import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState({
    type: 'Feasibility Studies',
    role: 'lead',
    client: '',
    consultant: '',
    startDate: '',
    endDate: ''
  });

  const projectTypes = {
    'Feasibility Studies': {
      baseCapacity: 25,
      maxConcurrent: 2,
      roleWeights: { lead: 25, support: 15, advisor: 8 }
    },
    'Development Assessments': {
      baseCapacity: 25,
      maxConcurrent: 2,
      roleWeights: { lead: 25, support: 15, advisor: 8 }
    },
    'Fundraising Counsel': {
      baseCapacity: 20,
      maxConcurrent: 3,
      roleWeights: { lead: 20, support: 12, advisor: 6 }
    },
    'Campaign Counsel': {
      baseCapacity: 15,
      maxConcurrent: 2,
      roleWeights: { lead: 15, support: 10, advisor: 5 }
    },
    'Campaign Planning': {
      baseCapacity: 15,
      maxConcurrent: 1,
      roleWeights: { lead: 15, support: 10, advisor: 5 }
    }
  };// Utility Functions
  const isProjectActive = (project) => {
    const today = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    return today >= startDate && today <= endDate;
  };

  const isProjectUpcoming = (project) => {
    const today = new Date();
    const startDate = new Date(project.startDate);
    return startDate > today && startDate <= new Date(today.setDate(today.getDate() + 30));
  };

  const calculateConsultantCapacityForDate = (consultant, date) => {
    return projects
      .filter(project => 
        project.consultant === consultant && 
        date >= new Date(project.startDate) && 
        date <= new Date(project.endDate)
      )
      .reduce((sum, project) => sum + projectTypes[project.type].roleWeights[project.role], 0);
  };

  const getUniqueConsultants = () => {
    return [...new Set(projects.map(project => project.consultant))].filter(Boolean);
  };

  const getFutureCapacityForecast = (months = 3) => {
    const forecast = [];
    const today = new Date();
    
    for(let i = 0; i < months; i++) {
      const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthCapacity = {
        month: futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        byConsultant: getUniqueConsultants().map(consultant => ({
          name: consultant,
          capacity: calculateConsultantCapacityForDate(consultant, futureDate)
        }))
      };
      forecast.push(monthCapacity);
    }
    return forecast;
  };

  const getConsultantCapacityWarnings = (consultant) => {
    const warnings = [];
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const currentCapacity = calculateConsultantCapacityForDate(consultant, today);
    if (currentCapacity > 100) {
      warnings.push(`Over capacity by ${(currentCapacity - 100).toFixed(1)}%`);
    }

    const nextMonthCapacity = calculateConsultantCapacityForDate(consultant, nextMonth);
    if (nextMonthCapacity > 100) {
      warnings.push(`Will be over capacity next month by ${(nextMonthCapacity - 100).toFixed(1)}%`);
    }

    const consultantProjects = projects.filter(p => p.consultant === consultant);
    const endingProjects = consultantProjects.filter(project => {
      const endDate = new Date(project.endDate);
      return endDate <= new Date(today.setDate(today.getDate() + 14));
    });
    
    if (endingProjects.length > 0) {
      warnings.push(`${endingProjects.length} project(s) ending in 2 weeks`);
    }

    return warnings;
  };

  const exportData = (format) => {
    const data = {
      projects: projects.map(project => ({
        ...project,
        capacity: projectTypes[project.type].roleWeights[project.role],
        status: isProjectActive(project) ? 'Active' : isProjectUpcoming(project) ? 'Upcoming' : 'Inactive'
      })),
      consultantCapacities: getUniqueConsultants().map(consultant => ({
        consultant,
        currentCapacity: calculateConsultantCapacityForDate(consultant, new Date()),
        warnings: getConsultantCapacityWarnings(consultant)
      }))
    };

    if (format === 'json') {
      const jsonString = JSON.stringify(data, null, 2);
      downloadFile(jsonString, 'capacity-data.json', 'application/json');
    } else if (format === 'csv') {
      const csvContent = [
        ['Client', 'Project Type', 'Role', 'Consultant', 'Start Date', 'End Date', 'Capacity %', 'Status'],
        ...data.projects.map(p => [
          p.client,
          p.type,
          p.role,
          p.consultant,
          p.startDate,
          p.endDate,
          p.capacity,
          p.status
        ])
      ].map(row => row.join(',')).join('\n');

      downloadFile(csvContent, 'capacity-data.csv', 'text/csv');
    }
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateTimelineData = () => {
    if (projects.length === 0) return [];

    const allDates = projects.reduce((dates, project) => {
      dates.push(new Date(project.startDate));
      dates.push(new Date(project.endDate));
      return dates;
    }, []);

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    return projects.map(project => ({
      ...project,
      start: new Date(project.startDate).getTime(),
      end: new Date(project.endDate).getTime(),
      startPosition: ((new Date(project.startDate) - minDate) / (maxDate - minDate)) * 100,
      duration: ((new Date(project.endDate) - new Date(project.startDate)) / (maxDate - minDate)) * 100
    }));
  };// ConsultantCapacitySection Component
  const ConsultantCapacitySection = ({ consultant }) => {
    const consultantProjects = projects.filter(p => p.consultant === consultant);
    const currentCapacity = calculateConsultantCapacityForDate(consultant, new Date());
    const warnings = getConsultantCapacityWarnings(consultant);
    
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{consultant}</h3>
          <span className={`px-2 py-1 rounded ${
            currentCapacity > 100 ? 'bg-red-100 text-red-800' :
            currentCapacity > 80 ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {currentCapacity.toFixed(1)}% Capacity
          </span>
        </div>
        
        {warnings.length > 0 && (
          <div className="space-y-1 mb-3">
            {warnings.map((warning, index) => (
              <div key={index} className="text-sm text-yellow-600">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <h4 className="text-sm font-medium mb-2">Active Projects:</h4>
          {consultantProjects
            .filter(isProjectActive)
            .map((project, index) => (
              <div key={index} className="text-sm text-gray-600 mb-1">
                • {project.client} - {project.type} ({projectTypes[project.type].roleWeights[project.role]}%)
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Consultant Capacity Dashboard</h1>
          <div className="space-x-2">
            <button
              onClick={() => exportData('csv')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportData('json')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Project Input Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="p-2 border rounded"
              value={currentProject.type}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                type: e.target.value
              })}
            >
              {Object.keys(projectTypes).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              className="p-2 border rounded"
              value={currentProject.role}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                role: e.target.value
              })}
            >
              <option value="lead">Project Lead</option>
              <option value="support">Project Support</option>
              <option value="advisor">Strategic Advisor</option>
            </select>

            <input
              type="text"
              placeholder="Client Name"
              className="p-2 border rounded"
              value={currentProject.client}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                client: e.target.value
              })}
            />

            <input
              type="text"
              placeholder="Consultant Name"
              className="p-2 border rounded"
              value={currentProject.consultant}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                consultant: e.target.value
              })}
            />

            <input
              type="date"
              className="p-2 border rounded"
              value={currentProject.startDate}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                startDate: e.target.value
              })}
            />

            <input
              type="date"
              className="p-2 border rounded"
              value={currentProject.endDate}
              onChange={(e) => setCurrentProject({
                ...currentProject,
                endDate: e.target.value
              })}
            />

            <button
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 md:col-span-2"
              onClick={() => {
                if (currentProject.client && currentProject.consultant && currentProject.startDate && currentProject.endDate) {
                  const newConsultantCapacity = calculateConsultantCapacityForDate(
                    currentProject.consultant,
                    new Date(currentProject.startDate)
                  ) + projectTypes[currentProject.type].roleWeights[currentProject.role];

                  if (newConsultantCapacity > 100) {
                    if (!window.confirm(
                      `Warning: This will put ${currentProject.consultant} at ${newConsultantCapacity.toFixed(1)}% capacity. Continue?`
                    )) {
                      return;
                    }
                  }
                  
                  setProjects([...projects, currentProject]);
                  setCurrentProject({
                    type: 'Feasibility Studies',
                    role: 'lead',
                    client: '',
                    consultant: '',
                    startDate: '',
                    endDate: ''
                  });
                }
              }}
            >
              Add Project
            </button>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Project Timeline</h2>
          <div className="relative h-auto">
            {generateTimelineData().map((project, index) => (
              <div 
                key={index} 
                className="relative h-12 mb-2"
              >
                <div 
                  className="absolute h-8 rounded bg-blue-500 text-white text-sm flex items-center px-2 overflow-hidden whitespace-nowrap"
                  style={{
                    left: `${project.startPosition}%`,
                    width: `${project.duration}%`,
                    backgroundColor: isProjectActive(project) ? '#3b82f6' : 
                                   isProjectUpcoming(project) ? '#60a5fa' : '#93c5fd'
                  }}
                >
                  {project.consultant} - {project.client} ({project.type})
                </div>
              </div>
            ))}
            <div className="h-6 border-t flex justify-between text-sm text-gray-500">
              {generateTimelineData().length > 0 && (
                <>
                  <span>{new Date(Math.min(...generateTimelineData().map(p => p.start))).toLocaleDateString()}</span>
                  <span>{new Date(Math.max(...generateTimelineData().map(p => p.end))).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Consultant Capacities */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Consultant Workloads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getUniqueConsultants().map(consultant => (
              <ConsultantCapacitySection key={consultant} consultant={consultant} />
            ))}
          </div>
          
          {/* Consultant Comparison Chart */}
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getUniqueConsultants().map(consultant => ({
                  name: consultant,
                  current: calculateConsultantCapacityForDate(consultant, new Date()),
                  upcoming: calculateConsultantCapacityForDate(consultant, new Date(new Date().setMonth(new Date().getMonth() + 1)))
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Capacity %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="current" name="Current Load" fill="#3b82f6" />
                <Bar dataKey="upcoming" name="Next Month" fill="#93c5fd" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;