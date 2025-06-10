import AdminLayout from "../layout/AdminLayout";

interface IProps {
    title: string
}
export default function MaintainanceMode({title}: IProps) {
    return (
        <AdminLayout>
            <div className="h-[calc(100vh-3rem)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold">{title}</h1>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-lg shadow p-6">
                    <h6>Feature is under development</h6>
                </div>
            </div>
        </AdminLayout>
    );
}   
