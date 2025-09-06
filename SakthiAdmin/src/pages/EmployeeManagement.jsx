import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  Users, 
  Award,
  X,
  Save,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    employeeNumber: '',
    name: '',
    email: '',
    department: '',
    designation: '',
    mobileNumber: '',
    creditPoints: 0,
    password: '',
    role: 'employee' // Add role to form state
  });

  // Import states
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Bulk delete states
  const [bulkDeleteFile, setBulkDeleteFile] = useState(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // Alert states
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Add state for role filter
  const [roleFilter, setRoleFilter] = useState('all');

  const { isAdmin, user } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, [filters, pagination.currentPage]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/users');
      setEmployees(response.data.users);
      setDepartments(response.data.departments);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showAlert('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const resetForm = () => {
    setEmployeeForm({
      employeeNumber: '',
      name: '',
      email: '',
      department: '',
      designation: '',
      mobileNumber: '',
      creditPoints: 0
    });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      // Only include password if provided and role is admin or reviewer
      const payload = { ...employeeForm };
      if (!payload.password || (payload.role !== 'admin' && payload.role !== 'reviewer')) {
        delete payload.password;
      }
      const response = await apiClient.post('/api/admin/employees', payload);
      setEmployees(prev => [response.data, ...prev]);
      setShowAddModal(false);
      resetForm();
      showAlert('success', 'Employee added successfully!');
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Failed to add employee');
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      // Only include password if provided and role is admin or reviewer
      const payload = { ...employeeForm };
      if (!payload.password || (payload.role !== 'admin' && payload.role !== 'reviewer')) {
        delete payload.password;
      }
      const response = await apiClient.put(`/api/admin/users/${selectedEmployee._id}`, payload);
      setEmployees(prev => prev.map(emp => 
        emp._id === selectedEmployee._id ? response.data : emp
      ));
      setShowEditModal(false);
      setSelectedEmployee(null);
      resetForm();
      showAlert('success', 'Employee updated successfully!');
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/admin/users/${employee._id}`);
      setEmployees(prev => prev.filter(emp => emp._id !== employee._id));
      showAlert('success', 'Employee deleted successfully!');
    } catch (error) {
      showAlert('error', 'Failed to delete employee');
    }
  };

  const handleUpdateCredits = async (employee, newCredits, reason) => {
    try {
      const response = await apiClient.patch(`/api/admin/employees/${employee._id}/credits`, {
        creditPoints: newCredits,
        reason
      });
      setEmployees(prev => prev.map(emp => 
        emp._id === employee._id ? response.data : emp
      ));
      showAlert('success', 'Credit points updated successfully!');
    } catch (error) {
      showAlert('error', 'Failed to update credit points');
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/admin/employees/export/excel', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('success', 'Employee data exported successfully!');
    } catch (error) {
      showAlert('error', 'Failed to export employee data');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showAlert('error', 'Please select a file to upload');
      return;
    }

    // Validate file type on frontend
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    if (!allowedTypes.includes(importFile.type)) {
      showAlert('error', 'Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (importFile.size > maxFileSize) {
      showAlert('error', 'File size must be less than 10MB');
      return;
    }

    try {
      setImportLoading(true);
      setImportResults(null); // Clear previous results
      
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await apiClient.post('/api/admin/employees/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minute timeout for larger files
      });

      // Handle successful response
      if (response.data.success) {
        setImportResults({
          success: true,
          message: response.data.message,
          summary: response.data.summary,
          successes: response.data.successes || [],
          errors: response.data.errors || [],
          warnings: response.data.warnings || [],
          count: response.data.employees?.length || 0
        });
        
        // Show appropriate alert based on results
        if (response.data.summary.failed === 0) {
          showAlert('success', response.data.message);
        } else if (response.data.summary.succeeded > 0) {
          showAlert('warning', `Import completed with ${response.data.summary.failed} errors. Check details below.`);
        } else {
          showAlert('error', 'Import failed. All rows had errors.');
        }
        
        // Refresh the employee list
        await fetchEmployees();
      } else {
        // Handle server-side validation errors
        setImportResults({
          success: false,
          message: response.data.message,
          errors: response.data.errors || []
        });
        showAlert('error', response.data.message);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      
      let errorMessage = 'Import failed';
      let errorDetails = [];
      
      if (error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
        errorDetails = error.response.data.errors || [];
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Import timeout. Please try with a smaller file.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setImportResults({
        success: false,
        message: errorMessage,
        errors: errorDetails
      });
      
      showAlert('error', errorMessage);
    } finally {
      setImportLoading(false);
    }
  };

  const handleBulkDelete = async (e) => {
    e.preventDefault();
    if (!bulkDeleteFile) {
      showAlert('error', 'Please select a file to upload');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedTypes.includes(bulkDeleteFile.type)) {
      showAlert('error', 'Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (max 5MB)
    if (bulkDeleteFile.size > 5 * 1024 * 1024) {
      showAlert('error', 'File size must be less than 5MB');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      setBulkDeleteResults(null); // Clear previous results
      
      const formData = new FormData();
      formData.append('file', bulkDeleteFile);

      const response = await apiClient.post('/api/admin/employees/bulk-delete', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });

      setBulkDeleteResults({
        success: true,
        message: response.data.message,
        successes: response.data.successes || [],
        notFound: response.data.notFound || [],
        errors: response.data.errors || []
      });
      
      // Refresh the employee list
      await fetchEmployees();
      
      // Show success alert
      showAlert('success', response.data.message);
      
      // Clear the file input
      setBulkDeleteFile(null);
      
    } catch (error) {
      console.error('Bulk delete error:', error);
      
      let errorMessage = 'Bulk delete failed';
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setBulkDeleteResults({
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      });
      
      showAlert('error', errorMessage);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDownloadInsertTemplate = async () => {
    try {
      const response = await apiClient.get('/api/admin/employees/bulk-insert-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bulk-insert-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('success', 'Bulk insert template downloaded successfully!');
    } catch (error) {
      showAlert('error', 'Failed to download insert template');
    }
  };

  const handleDownloadDeleteTemplate = async () => {
    try {
      const response = await apiClient.get('/api/admin/employees/bulk-delete-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bulk-delete-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('success', 'Bulk delete template downloaded successfully!');
    } catch (error) {
      showAlert('error', 'Failed to download delete template');
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      mobileNumber: employee.mobileNumber || '',
      creditPoints: employee.creditPoints,
      designation: employee.designation || '',
      password: '', // Clear password when opening edit modal
      role: employee.role || 'employee' // Set role in edit modal
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter employees by role before rendering the table
  const displayedEmployees = roleFilter === 'all' ? employees : employees.filter(emp => emp.role === roleFilter);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert.show && (
        <div className={`fixed top-2 right-2 sm:top-4 sm:right-4 z-50 p-2 sm:p-4 rounded-lg shadow-lg border ${
          alert.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {alert.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span className="text-base font-medium">{alert.message}</span>
            <button
              onClick={() => setAlert({ show: false, type: '', message: '' })}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-onPrimary">Employee Management</h1>
          <p className="mt-1 text-sm sm:text-base text-onPrimary">Manage employee data</p>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-base font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Delete
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white rounded-lg text-base font-medium hover:from-orange-500 hover:to-orange-700 transition-all shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Records</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RefreshCw className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="text-sm font-bold text-gray-900">Just now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-secondary-container rounded-lg shadow-sm border border-background p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="creditPoints">Sort by Credit Points</option>
            <option value="department">Sort by Department</option>
            <option value="createdAt">Sort by Date Added</option>
          </select>

          {/* Sort Order */}
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-secondaryContainer rounded-lg shadow-sm border border-background overflow-x-auto">
        <div className="px-6 py-4 border-b border-background">
          <h2 className="text-lg font-semibold text-gray-900">Employee Directory</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading employees...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-background text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-secondary-container divide-y divide-background">
                {displayedEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-secondary hover:text-surface group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-tertiary rounded-full flex items-center justify-center group-hover:text-primary group-hover:bg-gradient-to-r group-hover:from-surface group-hover:to-background ">
                          <span className="text-white font-medium text-base">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-base font-medium text-gray-900 group-hover:text-surface">
                            {employee.name}
                          </div>
                          <div className="text-base text-gray-500 group-hover:text-surface">
                            #{employee.employeeNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 group-hover:bg-tertiary">
                        <p className="text-base text-gray-500 group-hover:text-surface">{employee.department}</p>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-900 group-hover:text-surface">{employee.mobileNumber || employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-yellow-500 mr-1 group-hover:text-surface" />
                        <span className="text-lg font-bold text-yellow-600 group-hover:text-surface mt-2">
                          {employee.creditPoints}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 group-hover:text-surface">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-base font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-surface group-hover:text-surface p-1 rounded hover:bg-tertiary"
                        >
                          <Edit className="h-4 w-4 text-secondary group-hover:text-surface" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-tertiary"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 group-hover:text-surface" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-secondary-container px-4 py-3 border-t border-background sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-base text-gray-700">
                    Showing <span className="font-medium">{((pagination.currentPage - 1) * 20) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * 20, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-base font-medium ${
                          page === pagination.currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {employees.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first employee.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white rounded-lg hover:from-orange-500 hover:to-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add New Employee</h2>
                <button onClick={() => setShowAddModal(false)}><X className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Employee Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.employeeNumber}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee number"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter designation"
                  />
                </div>

                                 <div>
                   <label className="block text-base font-medium text-gray-700 mb-2">
                     Phone Number *
                   </label>
                   <input
                     type="tel"
                     required
                     value={employeeForm.mobileNumber}
                     onChange={(e) => setEmployeeForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g., 9876543210 or +919876543210"
                   />
                   <p className="text-xs text-gray-500 mt-1">+91 will be automatically added if not present</p>
                 </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Initial Credit Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={employeeForm.creditPoints}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, creditPoints: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Password (optional, for admin/reviewer)
                  </label>
                  <input
                    type="password"
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password (admin/reviewer only)"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={employeeForm.role}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Edit Employee</h2>
                <button onClick={() => setShowEditModal(false)}><X className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleEditEmployee} className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Employee Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.employeeNumber}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={employeeForm.mobileNumber}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 9876543210 or +919876543210"
                  />
                  <p className="text-xs text-gray-500 mt-1">+91 will be automatically added if not present</p>
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Credit Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={employeeForm.creditPoints}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, creditPoints: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Password (optional, for admin/reviewer)
                  </label>
                  <input
                    type="password"
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password (admin/reviewer only)"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={employeeForm.role}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">Import Employees</h2>
              <button onClick={() => setShowImportModal(false)}><X className="h-6 w-6" /></button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Excel Format Requirements</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• employeeNumber (required)</li>
                    <li>• name (required)</li>
                    <li>• email (required)</li>
                    <li>• department (required)</li>
                    <li>• designation (required)</li>
                    <li>• mobileNumber (required, will auto-add +91 if not present)</li>
                    <li>• role (required , employee, reviewer, admin)</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleDownloadInsertTemplate}
                    className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-base font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Insert Template
                  </button>
                </div>

                <form onSubmit={handleImport}>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Select Excel File
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {importResults && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      importResults.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center mb-3">
                        {importResults.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        )}
                        <p className={`text-base font-medium ${
                          importResults.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {importResults.message}
                        </p>
                      </div>

                      {/* Summary Statistics */}
                      {importResults.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-blue-600">{importResults.summary.total}</div>
                            <div className="text-sm text-gray-600">Total Rows</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-green-600">{importResults.summary.succeeded}</div>
                            <div className="text-sm text-gray-600">Succeeded</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-red-600">{importResults.summary.failed}</div>
                            <div className="text-sm text-gray-600">Failed</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-2xl font-bold text-yellow-600">{importResults.summary.warnings || 0}</div>
                            <div className="text-sm text-gray-600">Warnings</div>
                          </div>
                        </div>
                      )}

                      {/* Success Messages */}
                      {importResults.successes && importResults.successes.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-green-800 mb-2">Successful Imports:</h4>
                          <div className="max-h-60 overflow-y-auto bg-white p-3 rounded border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <ul className="text-xs text-green-700 space-y-1">
                              {importResults.successes.map((success, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-600 mr-2 mt-0.5 flex-shrink-0">✓</span>
                                  <span className="break-words">{success}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Warning Messages */}
                      {importResults.warnings && importResults.warnings.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                          <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {importResults.warnings.map((warning, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0">⚠</span>
                                  <span className="break-words">{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Error Messages */}
                      {importResults.errors && importResults.errors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                          <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <ul className="text-xs text-red-700 space-y-1">
                              {importResults.errors.map((error, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-red-600 mr-2 mt-0.5 flex-shrink-0">✗</span>
                                  <span className="break-words">{error}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportResults(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || importLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 flex items-center disabled:opacity-50"
                    >
                      {importLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-red-900">Bulk Delete Employees</h2>
              <button onClick={() => setShowBulkDeleteModal(false)}><X className="h-6 w-6" /></button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1">

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Warning: This action cannot be undone!</h4>
                  <p className="text-base text-red-800 mb-2">This will permanently delete the selected employees from the system.</p>
                  <h4 className="text-sm font-medium text-red-900 mb-2">Excel Format Requirements</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• <b>Employee Number</b> (required, must match exactly)</li>
                    <li>• The file should contain only one column: <b>Employee Number</b></li>
                    <li>• Each row should contain one employee number to delete</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleDownloadDeleteTemplate}
                    className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-base font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Delete Template
                  </button>
                </div>

                <form onSubmit={handleBulkDelete}>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Select Excel File with Employee IDs
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setBulkDeleteFile(e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  {bulkDeleteResults && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      bulkDeleteResults.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <p className={`text-base font-medium ${
                        bulkDeleteResults.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {bulkDeleteResults.message}
                      </p>
                      
                      {bulkDeleteResults.successes && bulkDeleteResults.successes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-green-700 mb-1">Successfully deleted:</p>
                          <ul className="text-xs text-green-700 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {bulkDeleteResults.successes.map((success, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-600 mr-2 mt-0.5 flex-shrink-0">✓</span>
                                <span className="break-words">{success}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {bulkDeleteResults.notFound && bulkDeleteResults.notFound.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-yellow-700 mb-1">Not found:</p>
                          <ul className="text-xs text-yellow-700 space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {bulkDeleteResults.notFound.map((notFound, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0">⚠</span>
                                <span className="break-words">{notFound}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {bulkDeleteResults.errors && bulkDeleteResults.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                          <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {bulkDeleteResults.errors.map((error, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-600 mr-2 mt-0.5 flex-shrink-0">✗</span>
                                <span className="break-words">{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkDeleteModal(false);
                        setBulkDeleteFile(null);
                        setBulkDeleteResults(null);
                        setBulkDeleteLoading(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!bulkDeleteFile || bulkDeleteLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-base font-medium hover:bg-red-700 flex items-center disabled:opacity-50"
                    >
                      {bulkDeleteLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Employees
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;