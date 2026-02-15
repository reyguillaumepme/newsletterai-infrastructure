
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Tutorial: React.FC = () => {
    const navigate = useNavigate();

    const steps = [
        {
            title: "1. Création de compte",
            description: "Commencez par créer votre compte ou vous connecter.",
            image: "/tutorial/01_login_page.png"
        },
        {
            title: "2. Tableau de bord",
            description: "Une fois connecté, vous arrivez sur votre tableau de bord.",
            image: "/tutorial/02_dashboard_overview.png"
        },
        {
            title: "3. Création d'une Marque",
            description: "Allez dans l'onglet 'Marques' et cliquez sur 'Nouvelle marque'.",
            image: "/tutorial/03_brand_list.png"
        },
        {
            title: "Remplir les détails de la marque",
            description: "Définissez le nom, l'audience et le ton de votre marque.",
            image: "/tutorial/04_brand_configuration_final.png"
        },
        {
            title: "4. Création d'un Concept",
            description: "Dans l'onglet 'Idées', créez un nouveau concept pour votre contenu.",
            image: "/tutorial/05a_idea_creation_modal.png"
        },
        {
            title: "Éditer le concept",
            description: "Détaillez votre idée avec un titre et du contenu.",
            image: "/tutorial/05b_idea_created.png"
        },
        {
            title: "5. Créer une Newsletter",
            description: "Depuis l'onglet 'Newsletters', lancez la création d'une nouvelle édition.",
            image: "/tutorial/07_newsletter_creation.png"
        },
        {
            title: "Éditeur de Newsletter",
            description: "Assemblez votre newsletter en ajoutant des sections et en utilisant vos idées.",
            image: "/tutorial/08_newsletter_editor.png"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Tutoriel d'utilisation</h1>
                        <p className="text-gray-500 mt-1">Guide étape par étape pour créer votre première newsletter.</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-24 relative before:absolute before:left-4 md:before:left-1/2 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200 before:-translate-x-1/2 before:z-0">
                    {steps.map((step, index) => (
                        <div key={index} className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-16 items-center">

                            {/* Timeline Node */}
                            <div className="absolute left-4 md:left-1/2 w-8 h-8 bg-white border-4 border-primary rounded-full -translate-x-1/2 flex items-center justify-center shrink-0 shadow-sm">
                                <span className="text-[10px] font-bold text-gray-400">{index + 1}</span>
                            </div>

                            {/* Text Content */}
                            <div className={`flex-1 md:text-right ${index % 2 === 0 ? 'md:order-1' : 'md:order-3'}`}>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 hover:shadow-md transition-all ml-12 md:ml-0">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-gray-500 leading-relaxed">{step.description}</p>
                                </div>
                            </div>

                            {/* Image Content */}
                            <div className={`flex-1 ${index % 2 === 0 ? 'md:order-3' : 'md:order-1'}`}>
                                <div className="bg-gray-900 rounded-2xl p-2 shadow-xl ml-12 md:ml-0 overflow-hidden group">
                                    <img
                                        src={step.image}
                                        alt={step.title}
                                        className="rounded-xl w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>

                        </div>
                    ))}
                </div>

                {/* CTA Footer */}
                <div className="flex justify-center pt-12">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl hover:-translate-y-1"
                    >
                        Commencer maintenant
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Tutorial;
