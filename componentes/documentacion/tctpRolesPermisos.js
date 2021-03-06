import { Select, Icon, Table, Alert } from 'antd';
import { rolesPermisosServices } from '../../services/rolesPermisosServices';
import { cleanStrings } from '../../services/cleanStrings';
import Loading from '../loading';
const { Option } = Select;

export default class extends React.Component {

    state = {
        permisosEncontrados: [],
        ousPermitidas: ["Organización", "Oferta de cursos", "Plantilla de curso", "Grupo"],
        rolesNoPermitidos: ["D2LMonitor", "Student (D2L)", "D2LEndUserSupport", "CourseCatalog", "Intructor (D2L)"],
        loading: false,
        rolToolsClaimsActual: undefined,
        error: false,
        errorCode: undefined,
        errorMsj: '',
        data: [],
        columns: [],
    }

    componentDidMount() {
        this.getRolesPermisos(this.props.lmsCode, this.props.tool);        
    }

    getRolesPermisos = async (lmsCode, tool) => {
        let resp = await rolesPermisosServices.seachRolesPermisos(lmsCode, tool);
        // console.log("resp", resp);
        if (resp.opCode == 500 || resp.opCode == 404 || resp.opCode == 405 || resp.opCode == 400) {
            this.setState({ permisosEncontrados: resp, loading: false, error: true, errorMsj: resp.opErrMsg, errorCode: resp.opCode });
        } else {            
            resp.sort((a, b) => a.displayName.localeCompare(b.displayName));  //ordenar por nombres  
            this.setState({ permisosEncontrados: resp, loading: false, error: false });
        }
    }

    changeSelectOptionRolName = (rolNameSeleccionado) => {
       this.setDataTableComponent(rolNameSeleccionado);
    }

    setDataTableComponent=(rolName)=>{
        let { objRolesPermisos, arrOusFiltradas } = this.setEstructuraDatos(rolName);
        //columnas para construir tabla
        const columns = [
            {
                title: 'Permisos',
                dataIndex: 'permiso',
                render: text => <span>{text}</span>,
            },
        ];
        arrOusFiltradas.forEach((ou) => {
            columns.push({ title: ou.name, dataIndex: cleanStrings.getCleanedString(ou.name), align: 'center', width: "12%" });
        })

        //data para construir tabla
        const data = [];
        objRolesPermisos.tools.forEach((tool) => {
            tool.claims.forEach((claim) => {
                let obj = {};
                obj.permiso = claim.displayname;
                obj.organizacion;
                obj.ofertadecursos;
                obj.plantilladecurso;
                obj.grupo;
                obj.seccion;
                
                //se identifican y se asignan los valores a las propiedades de cada fila
                claim.ous.forEach((ou, index) => {
                    obj.key = Math.random().toString(36).substring(2);
                    this.state.ousPermitidas.forEach((orgName) => {
                        if (orgName == ou.ouName) {
                            obj[cleanStrings.getCleanedString(orgName)] = this.setIconsIsAllowed(ou.allowed);
                        }
                    })
                })
                data.push(obj);
            })
        })
        this.setState({ rolToolsClaimsActual: objRolesPermisos, data: data, columns: columns });
    }

    evaluarOusHabilitadas(ou) {
        let ok = false;
        this.state.ousPermitidas.forEach((o) => {
            if (o == ou) {
                ok = true;
            }
        })
        return ok
    }

    setEstructuraDatos(rolName) {
        let arrOusFiltradas = [];
        let arrTools = [];
        let arrclaims = [];
        //filtrar permisos por rol para mostrar
        let [rolToolsClaims] = this.state.permisosEncontrados.filter((rol) => rol.displayName == rolName);
        let { tools, _id, displayName, lmsCode, rolId } = rolToolsClaims;
        //Construir objeto por orden jerarquico rol, tool, claims y ous
        tools.forEach((tool) => {
            let claims = tool.claims.sort((a, b) => a.displayName.localeCompare(b.displayName)); //ordenar permisos por nombres
            claims.forEach((claim) => {
                let ouNamesEncontrado = arrOusFiltradas.find(o => o.id == claim.ouTypeId);  //buscar OUTypes dentro de los permisos para crear un arreglo de OUs aislado                       
                if (!ouNamesEncontrado) {
                    if (this.evaluarOusHabilitadas(claim.ouTypeName)) {
                        arrOusFiltradas.push({ id: claim.ouTypeId, name: claim.ouTypeName });
                    }
                }
                let arrClaimsEncontrado = arrclaims.find(c => c.claimId == claim.claimId);
                if (!arrClaimsEncontrado) {
                    arrclaims.push({ displayname: claim.displayName, claimId: claim.claimId, ous: [{ grantId: claim.grantId, ouName: claim.ouTypeName, allowed: claim.allowed }] });
                } else {
                    arrClaimsEncontrado.ous.push({ grantId: claim.grantId, ouName: claim.ouTypeName, allowed: claim.allowed });
                }
            })
            let objTool = { displayName: tool.displayName, isActive: tool.isActive, toolId: tool.toolId, claims: arrclaims };
            arrTools.push(objTool);
        })
        arrOusFiltradas = arrOusFiltradas.sort((a, b) => { return a.id - b.id });  //ordenar ous
        let objRolesPermisos = { _id, displayName, lmsCode, rolId, tools: arrTools }
        // console.log("objRolesPermisos", objRolesPermisos);
        return { objRolesPermisos, arrOusFiltradas }
    }

    setIconsIsAllowed(allowed) {
        if (allowed) {
            return <Icon type="check" style={{ color: '#1abc9c' }} />
        } else {
            return <Icon type="close" style={{ color: '#e74c3c' }} />
        }
    }

    render() {
        let { rolToolsClaimsActual, loading, permisosEncontrados, data, columns, error, errorMsj, errorCode, rolesNoPermitidos } = this.state;
        // console.log("this.state", this.state);
        return (<div>
            {
                error ? <span>
                    <Alert message={`Error ${errorCode}: ${errorMsj}`} type="error" />
                </span> :
                    <span>
                        {
                            !loading && permisosEncontrados.length > 0 ? <div>
                                <Select
                                    showSearch
                                    value={rolToolsClaimsActual ? rolToolsClaimsActual.displayName : 'Por favor seleccione...'}
                                    style={{ width: '32%' }}
                                    onChange={this.changeSelectOptionRolName}
                                >
                                {
                                    permisosEncontrados.map((rol) => {
                                        if (!rolesNoPermitidos.includes(rol.displayName)) {
                                            return <Option key={rol._id} value={rol.displayName}>{rol.displayName}</Option>
                                        }
                                    })
                                }
                                </Select>
                            </div> : <span><Loading msj="Cargando datos..." /></span>
                        }
                    </span>
            }
            {
                <Table pagination={false} bordered columns={columns} dataSource={data} />
            }
        </div>)
    }

}


