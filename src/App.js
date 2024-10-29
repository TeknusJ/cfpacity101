import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
// Add these new functions here
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

const getConsultantCapacityWarnings = (consultant) => {
  const warnings = [];
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  const currentCapacity = calculateConsultantCapacityForDate(consultant, today);
  if (currentCapacity > 100) {
    warnings.push(`${consultant} is over capacity by ${(currentCapacity - 100).toFixed(1)}%`);
  }

  const nextMonthCapacity = calculateConsultantCapacityForDate(consultant, nextMonth);
  if (nextMonthCapacity > 100) {
    warnings.push(`${consultant} will be over capacity next month by ${(nextMonthCapacity - 100).toFixed(1)}%`);
  }

  const consultantProjects = projects.filter(p => p.consultant === consultant);
  const endingProjects = consultantProjects.filter(project => {
    const endDate = new Date(project.endDate);
    return endDate <= new Date(today.setDate(today.getDate() + 14));
  });
  
  if (endingProjects.length > 0) {
    warnings.push(`${consultant} has ${endingProjects.length} project(s) ending in the next 2 weeks`);
  }

  return warnings;
};
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
  };

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

  const calculateCapacityForDate = (date) => {
    return projects
      .filter(project => {
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);
        return date >= projectStart && date <= projectEnd;
      })
      .reduce((sum, project) => sum + projectTypes[project.type].roleWeights[project.role], 0);
  };

  const getCapacityWarnings = () => {
    const warnings = [];
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const currentCapacity = calculateCapacityForDate(today);
    if (currentCapacity > 100) {
      warnings.push(`Currently over capacity by ${(currentCapacity - 100).toFixed(1)}%`);
    }

    const nextMonthCapacity = calculateCapacityForDate(nextMonth);
    if (nextMonthCapacity > 100) {
      warnings.push(`Next month will be over capacity by ${(nextMonthCapacity - 100).toFixed(1)}%`);
    }

    const endingProjects = projects.filter(project => {
      const endDate = new Date(project.endDate);
      return endDate <= new Date(today.setDate(today.getDate() + 14));
    });
    
    if (endingProjects.length > 0) {
      warnings.push(`${endingProjects.length} project(s) ending in the next 2 weeks`);
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
      capacityWarnings: getCapacityWarnings(),
      totalCurrentCapacity: calculateCapacityForDate(new Date())
    };

    if (format === 'json') {
      const jsonString = JSON.stringify(data, null, 2);
      downloadFile(jsonString, 'capacity-data.json', 'application/json');
    } else if (format === 'csv') {
      const csvContent = [
        ['Client', 'Project Type', 'Role', 'Start Date', 'End Date', 'Capacity %', 'Status', 'Consultant'],
        ...data.projects.map(p => [
          p.client,
          p.type,
          p.role,
          p.startDate,
          p.endDate,
          p.capacity,
          p.status,
          p.consultant
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
  };

  const calculateTypeCapacity = (type) => {
    return projects
      .filter(p => p.type === type && isProjectActive(p))
      .reduce((sum, project) => sum + projectTypes[project.type].roleWeights[project.role], 0);
  };
  const ConsultantCapacitySection = ({ consultant }) => {
    const consultantProjects = projects.filter(p => p.consultant === consultant);
    const currentCapacity = calculateConsultantCapacityForDate(consultant, new Date());
    
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
        
        <div className="space-y-2">
          {getConsultantCapacityWarnings(consultant).map((warning, index) => (
            <div key={index} className="text-sm text-yellow-600">
              ⚠️ {warning}
            </div>
          ))}
        </div>
  
        <div className="mt-4">
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

        {getCapacityWarnings().length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Capacity Warnings</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside">
                    {getCapacityWarnings().map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
                if (currentProject.client && currentProject.startDate && currentProject.endDate) {
                  const newTotalCapacity = calculateCapacityForDate(new Date(currentProject.startDate));
                  if (newTotalCapacity > 100) {
                    if (!window.confirm(`Warning: Adding this project will exceed 100% capacity (${newTotalCapacity.toFixed(1)}%). Continue?`)) {
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
</button>
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
                  {project.client} - {project.type}
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

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Projects</h2>
          <div className="space-y-2">
            {projects.map((project, index) => (
              <div 
                key={index} 
                className={`flex justify-between items-center p-3 rounded
                  ${isProjectActive(project) ? 'bg-blue-50' : 
                    isProjectUpcoming(project) ? 'bg-green-50' : 'bg-gray-50'}`}
              >{/* Consultant Capacities */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Consultant Capacities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getUniqueConsultants().map(consultant => (
                    <ConsultantCapacitySection key={consultant} consultant={consultant} />
                  ))}
                </div>
              </div>
                <div>
                  <span className="font-medium">{project.client}</span>
                  <span className="text-sm text-gray-600"> - {project.type} ({project.role})</span>
                  <br />
                  <span className="text-sm text-gray-500">{project.consultant}</span>
                  <br />
                  <span className="text-xs text-gray-400">
                    {new Date(project.startDate).toLocaleDateString()} - 
                    {new Date(project.endDate).toLocaleDateString()}
                    {isProjectActive(project) && 
                      <span className="ml-2 text-green-500">(Active)</span>
                    }
                    {isProjectUpcoming(project) &&
                      <span className="ml-2 text-blue-500">(Upcoming)</span>
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>{projectTypes[project.type].roleWeights[project.role]}% capacity</span>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => setProjects(projects.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Capacity Utilization</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(projectTypes).map(([type, model]) => ({
                  type,
                  capacity: calculateTypeCapacity(type),
                  target: model.baseCapacity
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Capacity %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="capacity" fill="#3b82f6" name="Current %" />
                <Bar dataKey="target" fill="#93c5fd" name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;