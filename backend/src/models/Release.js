const mongoose = require('mongoose');

const ReleaseSchema = new mongoose.Schema({
  releaseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  version: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Testing', 'Ready', 'Released', 'Cancelled'],
    default: 'Planning'
  },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  releaseDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Release' }],
  notes: { type: String },
  attachments: [{
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  history: [{
    action: { type: String, required: true },
    description: { type: String, required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false }
  }]
}, { timestamps: true });

// Indexes for better performance
ReleaseSchema.index({ module: 1, status: 1 });
ReleaseSchema.index({ project: 1 });
ReleaseSchema.index({ createdBy: 1 });
ReleaseSchema.index({ releaseId: 1 });

module.exports = mongoose.model('Release', ReleaseSchema);
