        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Người tạo dự án:</span>
                <span className={styles.infoValue}>
                  {project.createdBy?.name || 'Không xác định'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ngày bắt đầu:</span>
                <span className={styles.infoValue}>{formatDate(project.startDate)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ngày kết thúc:</span>
                <span className={styles.infoValue}>{formatDate(project.endDate)}</span>
              </div>
            </div>
            <div className={styles.infoCardDescription}>
              <div className={styles.infoLabel}>Mô tả dự án</div>
              <div className={styles.descriptionBox}>
                {project.description ? (
                  <span className={styles.descriptionText}>{project.description}</span>
                ) : (
                  <span className={styles.noDescription}>Chưa có mô tả cho dự án này</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Documents Section */}
        <div className={styles.documentsSection}>
          <div className={styles.documentsHeader}>
            <h3 className={styles.documentsTitle}>Tài liệu tổng quan</h3>
          </div>
          {project.overviewDocs && project.overviewDocs.length > 0 ? (
            <div className={styles.documentsGrid}>
              {project.overviewDocs.map((file, index) => {
                const name = file.fileName || '';
                const dotIdx = name.lastIndexOf('.');
                const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
                const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
                const isImage = isImageFile(name);
                return (
                  <div key={file.fileId || file.fileName || index} className={styles.documentCard}>
                    <div className={styles.documentIcon}>{getFileIcon(name)}</div>
                    <div className={styles.documentInfo}>
                      <span className={styles.documentName} title={file.fileName}>
                        <span className={styles.fileBase}>{base}</span>
                        <span className={styles.fileExt}>{ext}</span>
                      </span>
                      <span className={styles.documentSize}>{formatFileSize(file.fileSize)}</span>
                    </div>
                    <div className={styles.documentActions}>
                      {isImage && (
                        <button
                          className={styles.viewButton}
                          onClick={() => handleViewImage(file)}
                          title="Xem hình ảnh"
                        >
                          <ViewIcon sx={{ fontSize: 18 }} />
                        </button>
                      )}
                      <button
                        className={styles.downloadButton}
                        onClick={() => handleDownloadFile(file)}
                        title="Tải xuống"
                      >
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/0/532.png"
                          alt="download"
                          className={styles.downloadIcon}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyDocuments}>
              <span className={styles.emptyIcon}>📄</span>
              <p className={styles.emptyText}>Chưa có tài liệu tổng quan nào</p>
            </div>
          )}
        </div>
        {/* Tabs Section */}
        <div className={styles.tabsHeader}>
          {[0,1].map(idx => (
            <button
              key={idx}
              className={
                styles.tabButton +
                (tabActive === idx ? ' ' + styles.tabButtonActive : '') +
                (hoverTab[idx] ? ' ' + styles.tabButtonHover : '')
              }
              onClick={() => setTabActive(idx)}
              onMouseEnter={() => setHoverTab(prev => prev.map((v, i) => i === idx ? true : v))}
              onMouseLeave={() => setHoverTab(prev => prev.map((v, i) => i === idx ? false : v))}
            >
              {idx === 0 ? 'Danh sách Module' : 'Lịch sử cập nhật'}
            </button>
          ))}
          <h3 className={styles.workflowTitle}>Tiến độ dự án</h3>
          <div className={styles.workflowProgress}>
            <div className={styles.workflowSteps}>
              <div className={`${styles.workflowStep} ${project.status !== 'Khởi tạo' ? styles.workflowStepCompleted : styles.workflowStepActive}`}>
                <div className={styles.workflowStepIcon}>📋</div>
                <div className={styles.workflowStepLabel}>Khởi tạo</div>
              </div>
              <div className={styles.workflowConnector}></div>
              <div className={`${styles.workflowStep} ${project.status === 'Đang triển khai' || project.status === 'Hoàn thành' ? styles.workflowStepCompleted : project.status === 'Khởi tạo' ? styles.workflowStepPending : styles.workflowStepActive}`}>
                <div className={styles.workflowStepIcon}>📦</div>
                <div className={styles.workflowStepLabel}>Phát triển</div>
              </div>
              <div className={styles.workflowConnector}></div>
              <div className={`${styles.workflowStep} ${project.status === 'Hoàn thành' ? styles.workflowStepCompleted : styles.workflowStepPending}`}>
                <div className={styles.workflowStepIcon}>✅</div>
                <div className={styles.workflowStepLabel}>Hoàn thành</div>
              </div>
            </div>
            <div className={styles.workflowStats}>
              <div className={styles.workflowStat}>
                <span className={styles.workflowStatValue}>{modules.length}</span>
                <span className={styles.workflowStatLabel}>Modules</span>
              </div>
              <div className={styles.workflowStat}>
                <span className={styles.workflowStatValue}>{modules.filter(m => m.status === 'Đang phát triển').length}</span>
                <span className={styles.workflowStatLabel}>Đang làm</span>
              </div>
              <div className={styles.workflowStat}>
                <span className={styles.workflowStatValue}>{modules.filter(m => m.status === 'Hoàn thành').length}</span>
                <span className={styles.workflowStatLabel}>Hoàn thành</span>
              </div>
              <div className={styles.workflowStat}>
                <span className={styles.workflowStatValue}>{project.members?.length || 0}</span>
                <span className={styles.workflowStatLabel}>Thành viên</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người tạo dự án:</span>
              <span className={styles.infoValue}>
                {project.createdBy?.name || 'Không xác định'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ngày bắt đầu:</span>
              <span className={styles.infoValue}>{formatDate(project.startDate)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ngày kết thúc:</span>
              <span className={styles.infoValue}>{formatDate(project.endDate)}</span>
            </div>
          </div>
          <div className={styles.infoCardDescription}>
            <div className={styles.infoLabel}>Mô tả dự án</div>
            <div className={styles.descriptionBox}>
              {project.description ? (
                <span className={styles.descriptionText}>{project.description}</span>
              ) : (
                <span className={styles.noDescription}>Chưa có mô tả cho dự án này</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents Section */}
      <div className={styles.documentsSection}>
        <div className={styles.documentsHeader}>
          <h3 className={styles.documentsTitle}>Tài liệu tổng quan</h3>
        </div>
        {project.overviewDocs && project.overviewDocs.length > 0 ? (
          <div className={styles.documentsGrid}>
            {project.overviewDocs.map((file, index) => {
              const name = file.fileName || '';
              const dotIdx = name.lastIndexOf('.');
              const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
              const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
              const isImage = isImageFile(name);
              return (
                <div key={file.fileId || file.fileName || index} className={styles.documentCard}>
                  <div className={styles.documentIcon}>{getFileIcon(name)}</div>
                  <div className={styles.documentInfo}>
                    <span className={styles.documentName} title={file.fileName}>
                      <span className={styles.fileBase}>{base}</span>
                      <span className={styles.fileExt}>{ext}</span>
                    </span>
                    <span className={styles.documentSize}>{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div className={styles.documentActions}>
                    {isImage && (
                      <button
                        className={styles.viewButton}
                        onClick={() => handleViewImage(file)}
                        title="Xem hình ảnh"
                      >
                        <ViewIcon sx={{ fontSize: 18 }} />
                      </button>
                    )}
                    <button
                      className={styles.downloadButton}
                      onClick={() => handleDownloadFile(file)}
                      title="Tải xuống"
                    >
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/0/532.png"
                        alt="download"
                        className={styles.downloadIcon}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyDocuments}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>Chưa có tài liệu tổng quan nào</p>
          </div>
        )}
      </div>
      {/* Tabs Section */}
      <div className={styles.tabsHeader}>
        {[0,1].map(idx => (
          <button
            key={idx}
            className={
              styles.tabButton +
              (tabActive === idx ? ' ' + styles.tabButtonActive : '') +
              (hoverTab[idx] ? ' ' + styles.tabButtonHover : '')
            }
            onClick={() => setTabActive(idx)}
            onMouseEnter={() => setHoverTab(prev => prev.map((v, i) => i === idx ? true : v))}
            onMouseLeave={() => setHoverTab(prev => prev.map((v, i) => i === idx ? false : v))}
          >
            {idx === 0 ? 'Danh sách Module' : 'Lịch sử cập nhật'}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {/* Tab 0: Danh sách Module */}
        {tabActive === 0 && (
          <>
            {canCreateModule && (
              <div className={isMobile ? styles.addModuleContainerMobile : styles.addModuleContainerDesktop}>
                <button
                  className={styles.addModuleButton}
                  onClick={() => setOpenModulePopup(true)}
                >
                  <span className={styles.addModulePlus}>+</span>
                  Thêm module
                </button>
              </div>
            )}
            {modules.length === 0 ? (
              <div className={styles.emptyModules}>
                <span className={styles.emptyIcon}>📦</span>
                <p className={styles.emptyText}>Chưa có module nào</p>
                <p className={styles.emptySubtext}>
                  Bắt đầu bằng cách thêm module đầu tiên
                </p>
              </div>
            ) : (
              <div className={isMobile ? styles.moduleGridMobile : styles.moduleGridDesktop}>
                {modules.map(module => (
                  <div key={module._id} className={styles.moduleCard}>
                    <div className={styles.moduleCardHeader}>
                      <div className={styles.moduleCardHeaderLeft}>
                        <span className={styles.moduleId}>#{module.moduleId || module._id}</span>
                        <div className={styles.moduleStatusIndicator}>
                          <span className={`${styles.statusIndicator} ${styles[`status${module.status.replace(/\s+/g, '')}`]}`}>
                            {module.status === 'Chưa phát triển' ? 'Chưa' :
                             module.status === 'Đang phát triển' ? 'Đang làm' :
                             module.status === 'Hoàn thành' ? 'Xong' : module.status}
                          </span>
                        </div>
                      </div>
                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: moduleStatusColors[module.status]?.background || '#f1f3f5',
                          color: moduleStatusColors[module.status]?.color || '#6c757d'
                        }}
                      >
                        {module.status}
                      </span>
                    </div>
                    <div className={styles.moduleName}>{module.name}</div>
                    <div className={styles.moduleMeta}>
                      <div className={styles.moduleOwner}>
                        <span className={styles.moduleMetaIcon}>👤</span>
                        <span className={styles.moduleOwnerName}>{module.owner?.name || '-'}</span>
                      </div>
                      <div className={styles.moduleTime}>
                        <span className={styles.moduleMetaIcon}>📅</span>
                        {module.startDate ? formatDate(module.startDate) : '-'}
                        {module.endDate ? ` - ${formatDate(module.endDate)}` : ''}
                      </div>
                    </div>
                    <div className={styles.moduleProgress}>
                      <div className={styles.moduleProgressBar}>
                        <div
                          className={styles.moduleProgressFill}
                          style={{
                            width: module.status === 'Hoàn thành' ? '100%' :
                                  module.status === 'Đang phát triển' ? '65%' : '15%'
                          }}
                        ></div>
                      </div>
                      <span className={styles.moduleProgressText}>
                        {module.status === 'Hoàn thành' ? '100%' :
                         module.status === 'Đang phát triển' ? '65%' : '15%'}
                      </span>
                    </div>
                    <div className={styles.moduleCardSpacer}></div>
                    <div className={styles.moduleCardFooter}>
                      <div className={styles.moduleStats}>
                        <span className={styles.moduleStat}>
                          <span className={styles.moduleStatIcon}>🚀</span>
                          {module.releases?.length || 0} releases
                        </span>
                      </div>
                      <button
                        className={styles.moduleDetailButton}
                        onClick={() => navigate(`/modules/${module._id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {/* Tab 1: Lịch sử cập nhật */}
        {tabActive === 1 && (
          project.history && project.history.length > 0 ? (
            <HistoryList history={project.history} />
          ) : (
            <div className={styles.noHistory}>Chưa có dữ liệu lịch sử cập nhật.</div>
          )
        )}
      </div>
    </div>
    <>
      <NewModulePopup
        open={openModulePopup}
        onClose={() => setOpenModulePopup(false)}
        members={project.members ? project.members.map(m => m.user) : []}
        currentUser={currentUser}
        modules={modules}
        onSubmit={async (formData) => {
          try {
            formData.append('projectId', id);
            formData.append('status', 'Chưa phát triển');
            const newModule = await ModuleService.createModule(formData);
            setModules(prevModules => [...prevModules, newModule]);
            await fetchProjectData();
            setOpenModulePopup(false);
            toast.success('Tạo module thành công!');
          } catch (error) {
            console.error('Error creating module:', error);
            toast.error('Có lỗi xảy ra khi tạo module. Vui lòng thử lại.');
          }
        }}
      />
      <AddMemToProjectPopup
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        loading={addingMember}
        existingUserIds={project.members ? project.members.map(m => m.user?._id) : []}
        onAdd={async (userIds) => {
          setAddingMember(true);
          try {
            const newMembers = [
              ...project.members.map(m => ({ user: m.user._id })),
              ...userIds.map(uid => ({ user: uid }))
            ];
            const accessToken = localStorage.getItem('accessToken');
            await axiosInstance.put(`/projects/${id}`, { members: newMembers }, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setShowAddMember(false);
            await fetchProjectData();
          } catch (err) {
            alert('Có lỗi khi thêm nhân sự');
          } finally {
            setAddingMember(false);
          }
        }}
      />
      <EditProjectPopup
        open={showEditPopup}
        onClose={()=>setShowEditPopup(false)}
        project={project}
        membersList={project.members ? project.members.map(m=>m.user) : []}
        loading={editProjectLoading}
        onSubmit={async (formData) => {
          setEditProjectLoading(true);
          try {
            const accessToken = localStorage.getItem('accessToken');
            await axiosInstance.put(`/projects/${id}`, formData, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            await fetchProjectData();
            setShowEditPopup(false);
            toast.success('Đã cập nhật dự án thành công!');
          } catch (err) {
            toast.error('Có lỗi khi cập nhật dự án!');
          } finally {
            setEditProjectLoading(false);
          }
        }}
      />
      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreview.open}
        onClose={handleCloseImagePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          {imagePreview.name}
          <IconButton onClick={handleCloseImagePreview} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center' }}>
          <img
            src={imagePreview.src}
            alt={imagePreview.name}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '4px'
            }}
          />
        </DialogContent>
      </Dialog>
    </></>
  );
};

export default ProjectDetail;
