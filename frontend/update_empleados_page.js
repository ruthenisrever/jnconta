const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\frontend\\app\\nomina\\empleados\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add state for Incidence Modal
const stateReplacement = `  const [showModal, setShowModal] = useState(false);
  const [showIncidenceModal, setShowIncidenceModal] = useState(false);
  const [selectedEmpForIncidence, setSelectedEmpForIncidence] = useState<any>(null);
  const [incidenceData, setIncidenceData] = useState({
    type: 'VACACIONES',
    days: 1,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });`;

content = content.replace('  const [showModal, setShowModal] = useState(false);', stateReplacement);

// Add handleSubmitIncidence
const loadEmployeesRegex = /  const filtered = employees.filter\(emp =>/;
const incidenceSubmit = `  const handleSubmitIncidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForIncidence) return;
    try {
      // Find active period or assume a dummy periodId for testing
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch('/api/payroll/incidences', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmpForIncidence.id,
          periodId: 'dummy-period-uuid', // Idealmente seleccionar periodo
          ...incidenceData
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar incidencia');
      }
      alert('Incidencia guardada con éxito. Si son vacaciones, se descontó del saldo.');
      setShowIncidenceModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = employees.filter(emp =>`;

content = content.replace(loadEmployeesRegex, incidenceSubmit);

// Add Incidence button per employee
const buttonRegex = /<button className="btn btn-ghost btn-sm flex-1 border border-surface-3 hover:bg-primary-500\/10">\s*<Edit3 size=\{14\} className="mr-2" \/> Editar\s*<\/button>/;
const buttonReplacement = `<button className="btn btn-ghost btn-sm flex-1 border border-surface-3 hover:bg-primary-500/10">
                     <Edit3 size={14} className="mr-2" /> Editar
                  </button>
                  <button className="btn btn-ghost btn-sm flex-1 border border-surface-3 hover:bg-amber-500/10 text-amber-500"
                    onClick={() => { setSelectedEmpForIncidence(emp); setShowIncidenceModal(true); }}>
                     Incidencias
                  </button>`;
content = content.replace(buttonRegex, buttonReplacement);

// Add Incidence Modal at the bottom
const modalRegex = /<\/div>\s*\);\s*\}\s*$/;
const incidenceModal = `
      {/* MODAL: REGISTRO DE INCIDENCIA */}
      {showIncidenceModal && selectedEmpForIncidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md border-surface-3 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-surface-3">
                <h2 className="text-xl font-bold">Registrar Incidencia</h2>
                <button className="text-muted hover:text-white" onClick={() => setShowIncidenceModal(false)}>✕</button>
             </div>
             <p className="text-sm text-muted mb-4">Empleado: <strong>{selectedEmpForIncidence.firstName} {selectedEmpForIncidence.lastName}</strong></p>

             <form onSubmit={handleSubmitIncidence} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Tipo de Incidencia</label>
                   <select className="search-input w-full" value={incidenceData.type} onChange={(e) => setIncidenceData({...incidenceData, type: e.target.value})}>
                     <option value="VACACIONES">Vacaciones</option>
                     <option value="FALTA_INJUSTIFICADA">Falta Injustificada</option>
                     <option value="INCAPACIDAD">Incapacidad (IMSS)</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha</label>
                   <input type="date" className="search-input w-full" value={incidenceData.date} onChange={(e) => setIncidenceData({...incidenceData, date: e.target.value})} required />
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Cantidad de Días</label>
                   <input type="number" className="search-input w-full" value={incidenceData.days} onChange={(e) => setIncidenceData({...incidenceData, days: parseFloat(e.target.value)})} required min="1" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Notas</label>
                   <input type="text" className="search-input w-full" value={incidenceData.notes} onChange={(e) => setIncidenceData({...incidenceData, notes: e.target.value})} />
                </div>

                <div className="flex gap-4 justify-end pt-6 border-t border-surface-3">
                   <button type="button" className="btn btn-ghost px-6" onClick={() => setShowIncidenceModal(false)}>Cancelar</button>
                   <button type="submit" className="btn btn-primary px-6">Guardar</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;
content = content.replace(modalRegex, incidenceModal);

fs.writeFileSync(path, content);
console.log('empleados/page.tsx updated with Incidences modal');
