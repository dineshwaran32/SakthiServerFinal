import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Download, Printer, Filter, Search } from 'lucide-react';
import axios from 'axios';
import apiClient from '../api/apiClient';

const Leaderboard = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    department: 'all',
    search: ''
  });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [filters]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('sortBy', 'creditPoints');
      params.append('sortOrder', 'desc');
      params.append('limit', '100');
      
      if (filters.department && filters.department !== 'all') {
        params.append('department', filters.department);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await apiClient.get(`/api/admin/users?${params}`);
      setEmployees(response.data.users);
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
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
      link.setAttribute('download', 'employee-leaderboard.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export leaderboard:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-xl font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadge = (rank) => {
    if (rank <= 3) {
      const colors = {
        1: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
        2: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
        3: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white'
      };
      return colors[rank];
    }
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading leaderboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-onPrimary">Employee Leaderboard</h1>
          <p className="mt-1 text-sm sm:text-base text-onPrimary">
            Rankings based on credit points earned from idea submissions
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors print:hidden"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-secondary-container rounded-lg shadow-sm border border-background p-2 sm:p-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
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
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      {employees.length >= 3 && (
        <div>
          <h2 className="text-xl sm:text-2xl text-primary font-bold text-center text-gray-900 mb-4 sm:mb-8 ">Top Performers</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center sm:items-end sm:space-x-8 gap-4 sm:gap-0 w-full">
            {/* Second Place */}
            <div className="text-center w-full max-w-xs">
              <div className="w-20 h-24 mx-auto bg-gradient-to-r from-primary to-tertiary rounded-lg flex items-center justify-center mb-4 shadow-lg">
                <Medal className="h-10 w-10 text-white" />
              </div>
              <div className="bg-secondary-container rounded-lg p-4 shadow-md min-w-[120px] text-center">
                <h3 className="font-semibold text-tertiary ">{employees[1]?.name}</h3>
                <p className="text-base text-surfaceVariant">{employees[1]?.department}</p>
                <p className="text-xl font-bold text-primary mt-2">
                  {employees[1]?.creditPoints} pts
                </p>
              </div>
            </div>

            {/* First Place */}
            <div className="text-center w-full max-w-xs">
              <div className="w-24 h-32 mx-auto bg-gradient-to-r from-primary to-tertiary rounded-lg flex items-center justify-center mb-4 shadow-xl">
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <div className="bg-secondary-container rounded-lg p-4 shadow-lg min-w-[120px] border-2 border-primary">
                <h3 className="font-bold text-tertiary">{employees[0]?.name}</h3>
                <p className="text-base text-surfaceVariant">{employees[0]?.department}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {employees[0]?.creditPoints} pts
                </p>
              </div>
            </div>

            {/* Third Place */}
            <div className="text-center w-full max-w-xs">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-primary to-tertiary rounded-lg flex items-center justify-center mb-4 shadow-lg">
                <Award className="h-10 w-10 text-white" />
              </div>
              <div className="bg-secondary-container rounded-lg p-4 shadow-md min-w-[120px]">
                <h3 className="font-semibold text-tertiary">{employees[2]?.name}</h3>
                <p className="text-base text-surfaceVariant">{employees[2]?.department}</p>
                <p className="text-xl font-bold text-primary mt-2">
                  {employees[2]?.creditPoints} pts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-secondary-container rounded-lg shadow-sm border border-background overflow-x-auto pb-4 relative">
        <div className="px-2 sm:px-6 py-2 sm:py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-surface">Complete Rankings</h2>
        </div>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 pb-4">
          <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm ">
            <thead className="bg-secondaryContainer">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Credit Points
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee, index) => {
                const rank = index + 1;
                return (
                  <tr key={employee._id} className={rank <= 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-bold ${getRankBadge(rank)}`}>
                          {rank <= 3 ? getRankIcon(rank) : rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {/* Placeholder for avatar */}
                        </div>
                        <div className="ml-2 sm:ml-4">
                          <div className="text-xs sm:text-base font-medium text-gray-900">{employee.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-base text-gray-900">{employee.department}</div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs sm:text-base leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {employee.creditPoints}
                      </span>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-base text-gray-500">
                      {employee.employeeNumber}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile swipe hint and right fade */}
        <div className="block sm:hidden text-center text-xs text-gray-400 mt-2">Swipe left/right to see more &rarr;</div>
        <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-gradient-to-l from-secondary-container to-transparent hidden sm:block" />
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;