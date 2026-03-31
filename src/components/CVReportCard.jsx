import React from 'react';

/**
 * CV grading breakdown — same layout as "Your last CV report" dashboard card.
 */
export default function CVReportCard({
  animatedMetrics = true,
  reportHasData,
  reportDisplayMetrics = [],
  reportLetter,
  reportActiveGrade,
  reportActiveScore,
  title = 'Your last CV report',
  description = '',
  compact = false,
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-2xl ${compact ? 'p-6' : 'p-8'} transform transition-all duration-300 border border-gray-100`}
    >
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <h3 className={`font-bold text-gray-800 ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {reportHasData ? title : 'Grading metrics'}
          </h3>
          {description ? (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          ) : !reportHasData ? (
            <p className="text-sm text-gray-500 mt-1">Upload a resume — your scores will appear here</p>
          ) : null}
        </div>
      </div>
      {!reportHasData ? (
        <div className="py-10 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="font-medium">No grading report yet</p>
          <p className="text-sm mt-2 max-w-md mx-auto px-2">
            After you analyze a CV, this panel shows your latest scores (stored in this browser).
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {reportDisplayMetrics.map((metric, index) => (
              <div key={metric.label} className="space-y-2 group">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                    {metric.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-800">{metric.value}%</span>
                    {metric.value >= 90 && <span className="text-green-500 font-bold">✓ Excellent</span>}
                    {metric.value >= 75 && metric.value < 90 && (
                      <span className="text-blue-500 font-bold">✓ Good</span>
                    )}
                    {metric.value < 75 && (
                      <span className="text-orange-500 font-bold">⚠ Needs Improvement</span>
                    )}
                  </div>
                </div>
                <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-1000 ease-out relative`}
                    style={{
                      width: animatedMetrics ? `${metric.value}%` : '0%',
                      transitionDelay: `${index * 100}ms`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white bg-opacity-30 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                <div className="text-5xl font-bold">{reportLetter}</div>
              </div>
              <div className="text-xl font-semibold">Overall: {reportActiveGrade}</div>
              <div className="text-sm mt-2 opacity-90">
                Score {reportActiveScore}/100 · Based on 5 derived metrics from your analysis
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
