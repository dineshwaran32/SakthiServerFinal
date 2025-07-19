import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, RefreshCw, FileText, Award, Users, XCircle, Eye, Search, Download } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { Listbox } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

const statusCards = [
  {
    key: 'totalIdeas',
    label: 'Total Ideas',
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
    status: 'all',
    emptyText: 'submitted',
  },
  {
    key: 'underReview',
    label: 'Under Review',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-600',
    status: 'under_review',
    emptyText: 'under review',
  },
  {
    key: 'ongoing',
    label: 'Ongoing',
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-600',
    status: 'ongoing',
    emptyText: 'ongoing',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-600',
    status: 'approved',
    emptyText: 'approved',
  },
  {
    key: 'implemented',
    label: 'Implemented',
    icon: Award,
    color: 'bg-purple-100 text-purple-600',
    status: 'implemented',
    emptyText: 'implemented',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-600',
    status: 'rejected',
    emptyText: 'rejected',
  },
];

const statusOptions = [
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'implemented', label: 'Implemented', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const AdminIdeasDashboard = () => {
  const { user, isAdmin, isReviewer } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEmptyText, setSelectedEmptyText] = useState('submitted');
  const [showModal, setShowModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', reviewComments: '', priority: '', reviewedBy: '' });
  const [reviewers, setReviewers] = useState([]);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [reviewersError, setReviewersError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [departments, setDepartments] = useState([]);

  // Move fetchStats outside useEffect so it can be called after status update
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/ideas/stats/dashboard');
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch idea statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Move fetchIdeas outside useEffect so it can be called after status update
  const fetchIdeas = async () => {
    try {
      setIdeasLoading(true);
      let ideasUrl = `/api/admin/ideas?limit=50&sortBy=createdAt&sortOrder=desc`;
      if (selectedStatus && selectedStatus !== 'all') ideasUrl += `&status=${selectedStatus}`;
      if (search) ideasUrl += `&search=${encodeURIComponent(search)}`;
      if (filterStatus && filterStatus !== 'all') ideasUrl += `&status=${filterStatus}`;
      if (
        isAdmin ||
        ((selectedStatus !== 'approved' && selectedStatus !== 'implemented') && (filterDepartment && filterDepartment !== 'all')) ||
        ((selectedStatus === 'approved' || selectedStatus === 'implemented') && filterDepartment && filterDepartment !== 'all')
      ) {
        ideasUrl += `&department=${filterDepartment}`;
      }
      if (filterPriority && filterPriority !== 'all') ideasUrl += `&priority=${filterPriority}`;
      const ideasResponse = await apiClient.get(ideasUrl);
      setIdeas(ideasResponse.data.ideas || []);
      setDepartments(ideasResponse.data.departments || []);
    } catch (err) {
      setIdeasError('Failed to fetch ideas list');
    } finally {
      setIdeasLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, [selectedStatus, search, filterStatus, filterDepartment, filterPriority, isAdmin]);

  const handleViewIdea = (idea) => {
    setSelectedIdea(idea);
    setStatusUpdate({
      status: idea.status,
      reviewComments: idea.reviewComments || '',
      priority: idea.priority,
      reviewedBy: idea.reviewedBy || ''
    });
    setShowModal(true);
    fetchReviewers();
  };

  const fetchReviewers = async () => {
    try {
      setReviewersLoading(true);
      const reviewersResponse = await apiClient.get('/api/admin/reviewers');
      setReviewers(reviewersResponse.data);
    } catch (err) {
      setReviewersError('Failed to fetch reviewers');
    } finally {
      setReviewersLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedIdea) return;
    try {
      await apiClient.patch(`/api/admin/ideas/${selectedIdea._id}/status`, {
        status: statusUpdate.status,
        reviewComments: statusUpdate.reviewComments,
        priority: statusUpdate.priority,
        reviewedBy: statusUpdate.reviewedBy
      });
      setShowModal(false);
      setSelectedIdea(null);
      // Refresh ideas list and stats after update
      fetchIdeas();
      fetchStats();
    } catch (err) {
      alert('Failed to update idea status');
    }
  };

  // Export Excel handler
  const handleExport = async () => {
    try {
      let exportUrl = `/api/admin/ideas/export/excel?limit=1000&sortBy=createdAt&sortOrder=desc`;
      if (selectedStatus && selectedStatus !== 'all') exportUrl += `&status=${selectedStatus}`;
      if (search) exportUrl += `&search=${encodeURIComponent(search)}`;
      if (filterDepartment && filterDepartment !== 'all') exportUrl += `&department=${filterDepartment}`;
      if (filterPriority && filterPriority !== 'all') exportUrl += `&priority=${filterPriority}`;
      const exportResponse = await apiClient.get(exportUrl, { responseType: 'blob' });
      const blob = new Blob([exportResponse.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'ideas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export ideas');
    }
  };

  // Fetch reviewers on mount so we can display reviewer names in the table
  useEffect(() => {
    if (reviewers.length === 0) {
      fetchReviewers();
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-onPrimary">Ideas Dashboard</h1>
          <p className="mt-1 text-base text-onPrimary">Overview of idea submissions and statuses</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading statistics...</span>
        </div>
      ) : error ? (
        <div className="text-red-600 text-center">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {statusCards.map(card => {
              const Icon = card.icon;
              let value = 0;
              if (stats) {
                if (card.key === 'rejected') {
                  const rejected = stats.statusDistribution?.find(s => s._id === 'rejected');
                  value = rejected ? rejected.count : 0;
                } else if (card.key === 'ongoing') {
                  const ongoing = stats.statusDistribution?.find(s => s._id === 'ongoing');
                  value = ongoing ? ongoing.count : 0;
                } else {
                  value = stats[card.key] || 0;
                }
              }
              const isActive = selectedStatus === card.status;
              return (
                <button
                  key={card.key}
                  className={`bg-secondaryContainer rounded-lg shadow-sm border border-background p-3 focus:outline-none transition-all flex flex-col items-center ${isActive ? 'ring-2 ring-primary' : ''} hover:bg-primary hover:scale-105 transition-transform duration-200 hover:text-[#E6F5E4]`}
                  onClick={() => { setSelectedStatus(card.status); setSelectedEmptyText(card.emptyText); }}
                  style={{ minWidth: 0 }}
                >
                  <div className="flex items-center justify-center">
                    <div className={`p-1 rounded-lg ${card.color} group-hover:text-onPrimary`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mt-1 text-center group-hover:text-[#E6F5E4]">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 text-center group-hover:text-[#E6F5E4]">{value}</p>
                </button>
              );
            })}
          </div>

          {/* Filters and Refresh */}
          <div className="bg-secondary-container rounded-lg shadow-sm border border-background p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ideas..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Department Filter */}
              {(isAdmin || (isReviewer && (selectedStatus === 'approved' || selectedStatus === 'implemented'))) && (
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="border border-background rounded-lg px-3 py-2 text-base bg-background text-onPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="border border-background rounded-lg px-3 py-2 text-base bg-background text-onPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="all">All Priorities</option>
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
              {/* Export & Refresh Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </button>
                <button
                  onClick={() => {
                    setSearch('');
                    setFilterDepartment('all');
                    setFilterPriority('all');
                    setIdeasLoading(true);
                    let refreshIdeasUrl = `/api/admin/ideas?limit=50&sortBy=createdAt&sortOrder=desc`;
                    if (selectedStatus && selectedStatus !== 'all') refreshIdeasUrl += `&status=${selectedStatus}`;
                    apiClient.get(refreshIdeasUrl).then(refreshResponse => {
                      setIdeas(refreshResponse.data.ideas || []);
                      setDepartments(refreshResponse.data.departments || []);
                      setIdeasLoading(false);
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Idea Directory Table */}
          <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-background">
              <h2 className="text-xl font-semibold text-gray-900">Idea Directory</h2>
            </div>
            {ideasLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading ideas...</span>
              </div>
            ) : ideasError ? (
              <div className="text-red-600 text-center">{ideasError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-background">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Idea</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="bg-secondary-container divide-y divide-background">
                    {ideas.map((idea) => {
                      // Find reviewer name by employeeNumber
                      let assignedTo = '-';
                      if (idea.assignedReviewer) {
                        const reviewer = reviewers.find(r => r.employeeNumber === idea.assignedReviewer);
                        assignedTo = reviewer ? reviewer.name : idea.assignedReviewer;
                      }
                      return (
                        <tr key={idea._id} className="hover:bg-secondary hover:text-surface group cursor-pointer" onClick={() => handleViewIdea(idea)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-primary to-tertiary rounded-full flex items-center justify-center group-hover:text-primary group-hover:bg-gradient-to-r group-hover:from-surface group-hover:to-background ">
                                <span className="text-white font-medium text-base">
                                  {idea.submittedByName ? idea.submittedByName.split(' ').map(n => n[0]).join('') : '?'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-base font-medium text-gray-900 group-hover:text-surface">
                                  {idea.title}
                                </div>
                                <div className="text-base text-gray-500 group-hover:text-surface">
                                  #{idea.submittedByEmployeeNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 group-hover:bg-tertiary">
                              <p className="text-base text-gray-500 group-hover:text-surface">{idea.department}</p>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900 group-hover:text-surface">{idea.createdAt ? format(new Date(idea.createdAt), 'yyyy-MM-dd') : ''}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900 group-hover:text-surface">{idea.submittedByEmployeeNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-base text-gray-900 group-hover:text-surface">{assignedTo}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {ideas.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    {(isReviewer && selectedStatus === 'under_review')
                      ? 'No ideas are currently under review.'
                      : `No ideas have been ${selectedEmptyText} yet.`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Idea Detail Modal */}
          {showModal && selectedIdea && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 ">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-primary">Idea Details</h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {/* Idea Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-surface mb-2">
                          {selectedIdea.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-base text-gray-100">
                          <span>{selectedIdea.department}</span>
                          <span>•</span>
                          <span>{selectedIdea.createdAt ? format(new Date(selectedIdea.createdAt), 'yyyy-MM-dd') : ''}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-surface mb-2">Problem Statement</h4>
                        <p className="text-gray-300">{selectedIdea.problem}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-surface mb-2">Proposed Improvement</h4>
                        <p className="text-gray-300">{selectedIdea.improvement}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-surface mb-2">Expected Benefit</h4>
                        <p className="text-gray-300">{selectedIdea.benefit}</p>
                      </div>
                      {/* Images Section (below Expected Benefit) */}
                      {selectedIdea.images && selectedIdea.images.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-surface mb-2">Images</h4>
                          <div className="flex flex-wrap gap-4">
                            {selectedIdea.images.map((img, idx) => (
                              <div key={idx} className="border rounded-lg p-2 bg-white shadow-sm">
                                <img
                                  src={`http://localhost:3001/app/uploads/${img.filename}`}
                                  alt={img.originalName || `Idea Image ${idx + 1}`}
                                  className="w-32 h-32 object-cover rounded mb-1"
                                  style={{ maxWidth: '128px', maxHeight: '128px' }}
                                />
                                <div className="text-sm text-gray-600 truncate max-w-[120px]" title={img.originalName}>{img.originalName}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-secondary mb-2">Submission Details</h4>
                        <div className="space-y-2 text-base">
                          <div className="flex justify-between">
                            <span className="text-gray-800">Submitted by</span>
                            <span className="font-medium">{selectedIdea.submittedByName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-800">Employee #:</span>
                            <span className="font-medium">{selectedIdea.submittedByEmployeeNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-800">Department:</span>
                            <span className="font-medium">{selectedIdea.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-800">Estimated Savings:</span>
                            <span className="font-medium">$
                              {selectedIdea.estimatedSavings !== undefined && selectedIdea.estimatedSavings !== null
                                ? selectedIdea.estimatedSavings.toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-base font-semibold text-surface mb-2">Status</label>
                          <Listbox value={statusUpdate.status} onChange={val => setStatusUpdate(prev => ({ ...prev, status: val }))}>
                            <div className="relative">
                              <Listbox.Button className="w-full border border-background rounded-lg px-3 py-2 text-base bg-background text-onPrimary focus:outline-primary focus:ring-2 focus:ring-primary focus:border-primary flex justify-between items-center">
                                {statusOptions.find(opt => opt.value === statusUpdate.status)?.label || 'Select Status'}
                                <span className="ml-2">▼</span>
                              </Listbox.Button>
                              <Listbox.Options className="absolute mt-1 w-full bg-secondaryContainer rounded-lg shadow-lg z-10">
                                {statusOptions.map(option => (
                                  <Listbox.Option
                                    key={option.value}
                                    value={option.value}
                                    className={({ active, selected }) =>
                                      `cursor-pointer select-none px-4 py-2 text-black ${active || selected ? 'bg-primary text-surface' : ''}`
                                    }
                                  >
                                    {option.label}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </div>
                          </Listbox>
                        </div>

                        <div>
                          <label className="block text-base font-semibold text-surface mb-2">Priority</label>
                          <Listbox value={statusUpdate.priority} onChange={val => setStatusUpdate(prev => ({ ...prev, priority: val }))}>
                            <div className="relative">
                              <Listbox.Button className="w-full border border-background rounded-lg px-3 py-2 text-base bg-background text-onPrimary focus:outline-tertiary focus:ring-2 focus:ring-primary focus:border-primary flex justify-between items-center">
                                {priorityOptions.find(opt => opt.value === statusUpdate.priority)?.label || 'Select Priority'}
                                <span className="ml-2">▼</span>
                              </Listbox.Button>
                              <Listbox.Options className="absolute mt-1 w-full bg-secondaryContainer rounded-lg shadow-lg z-10">
                                {priorityOptions.map(option => (
                                  <Listbox.Option
                                    key={option.value}
                                    value={option.value}
                                    className={({ active, selected }) =>
                                      `cursor-pointer select-none px-4 py-2 text-black ${active || selected ? 'bg-primary text-surface' : ''}`
                                    }
                                  >
                                    {option.label}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </div>
                          </Listbox>
                        </div>

                        {/* Reviewer Assignment */}
                        {isAdmin && (
                          <div>
                            <label className="block text-base font-semibold text-surface mb-2">Assign Reviewer</label>
                            {reviewersLoading ? (
                              <div className="text-gray-500 text-base">Loading reviewers...</div>
                            ) : reviewersError ? (
                              <div className="text-red-500 text-base">{reviewersError}</div>
                            ) : (
                              <Listbox value={selectedIdea.assignedReviewer || ''} onChange={async val => {
                                // Call backend to assign reviewer
                                await apiClient.patch(`/api/admin/ideas/${selectedIdea._id}/assign-reviewer`, { assignedReviewer: val });
                                setSelectedIdea(prev => ({ ...prev, assignedReviewer: val }));
                              }}>
                                <div className="relative">
                                  <Listbox.Button className="w-full border border-background rounded-lg px-3 py-2 text-base bg-background text-onPrimary focus:outline-tertiary focus:ring-2 focus:ring-primary focus:border-primary flex justify-between items-center">
                                    {reviewers.find(r => r.employeeNumber === selectedIdea.assignedReviewer)?.name || 'Select Reviewer'}
                                    <span className="ml-2">▼</span>
                                  </Listbox.Button>
                                  <Listbox.Options className="absolute mt-1 w-full bg-secondaryContainer rounded-lg shadow-lg z-10">
                                    {reviewers.map(reviewer => (
                                      <Listbox.Option
                                        key={reviewer.employeeNumber}
                                        value={reviewer.employeeNumber}
                                        className={({ active, selected }) =>
                                          `cursor-pointer select-none px-4 py-2 text-black ${active || selected ? 'bg-primary text-surface' : ''}`
                                        }
                                      >
                                        {reviewer.name} ({reviewer.role})
                                      </Listbox.Option>
                                    ))}
                                  </Listbox.Options>
                                </div>
                              </Listbox>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-base font-semibold text-surface mb-2">Review Comments</label>
                          <textarea
                            value={statusUpdate.reviewComments}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, reviewComments: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add your review comments..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-tertiary hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleStatusUpdate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition-colors"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminIdeasDashboard; 