import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mAdminAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

const VerificationHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [modifyingCattle, setModifyingCattle] = useState(null);
  const [modifyFormData, setModifyFormData] = useState({
    newDecision: '',
    message: ''
  });

  useEffect(() => {
    fetchHistory();
  }, [filters.status, filters.page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await mAdminAPI.getVerificationHistory(params);

      if (response.success) {
        setHistory(response.data.cattle);
        setTotalPages(response.data.pagination.pages);
        setTotalRecords(response.data.pagination.total);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load verification history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchHistory();
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const openModifyDialog = (cattle) => {
    setModifyingCattle(cattle);
    setModifyFormData({
      newDecision: cattle.verification.status === 'approved' ? 'rejected' : 'approved',
      message: ''
    });
  };

  const closeModifyDialog = () => {
    setModifyingCattle(null);
    setModifyFormData({ newDecision: '', message: '' });
  };

  const handleModifyDecision = async (e) => {
    e.preventDefault();

    if (modifyFormData.newDecision === 'rejected' && !modifyFormData.message.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await mAdminAPI.updateVerificationDecision(modifyingCattle._id, {
        newDecision: modifyFormData.newDecision,
        message: modifyFormData.message
      });

      if (response.success) {
        toast.success(response.message || 'Decision updated successfully');
        closeModifyDialog();
        fetchHistory();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update decision');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verification History</h1>
              <p className="mt-2 text-sm text-gray-600">
                View and modify cattle verification decisions
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Cattle ID or Breed
              </label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Enter Cattle ID or Breed..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {history.length} of {totalRecords} records
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status !== 'all'
                ? 'Try adjusting your filters'
                : 'No cattle verification history available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((cattle) => (
              <div
                key={cattle._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Cattle Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Cattle ID: {cattle.cattleId}
                        </h3>
                        {getStatusBadge(cattle.verification.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Breed</p>
                          <p className="text-sm font-medium text-gray-900">{cattle.breed}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Age</p>
                          <p className="text-sm font-medium text-gray-900">{cattle.age} years</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gender</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{cattle.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Verified Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(cattle.verification.verifiedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Verified By */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500">Verified By</p>
                        <p className="text-sm font-medium text-gray-900">
                          {cattle.verification.verifiedBy?.fullName || 'Unknown Admin'}
                        </p>
                      </div>

                      {/* Message */}
                      {cattle.verification.message && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Message</p>
                          <p className="text-sm text-gray-700">{cattle.verification.message}</p>
                        </div>
                      )}

                      {/* Owner Info */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Owner Details</p>
                        <p className="text-sm font-medium text-gray-900">{cattle.owner?.fullName}</p>
                        <p className="text-sm text-gray-600">{cattle.owner?.mobileNumber}</p>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="ml-6">
                      <p className="text-xs text-gray-500 mb-2">Sample Images</p>
                      <div className="flex gap-2">
                        {cattle.images?.face?.[0] && (
                          <img
                            src={getImageUrl(cattle.images.face[0].url)}
                            alt="Face"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        )}
                        {cattle.images?.right?.[0] && (
                          <img
                            src={getImageUrl(cattle.images.right[0].url)}
                            alt="Right"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => openModifyDialog(cattle)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Modify Decision
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modify Decision Modal */}
      {modifyingCattle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Modify Verification Decision
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Cattle ID:</span> {modifyingCattle.cattleId}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Current Status:</span>{' '}
                  <span className="capitalize">{modifyingCattle.verification.status}</span>
                </p>
              </div>

              <form onSubmit={handleModifyDecision}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Decision
                  </label>
                  <select
                    value={modifyFormData.newDecision}
                    onChange={(e) => setModifyFormData(prev => ({ ...prev, newDecision: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Decision</option>
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>

                {modifyFormData.newDecision === 'rejected' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={modifyFormData.message}
                      onChange={(e) => setModifyFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Explain why this decision is being changed..."
                      required
                    />
                  </div>
                )}

                {modifyFormData.newDecision === 'approved' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={modifyFormData.message}
                      onChange={(e) => setModifyFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any comments..."
                    />
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModifyDialog}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Decision
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationHistory;
