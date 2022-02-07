Rails.application.routes.draw do
  root to: "campaigns#index"
  resources :campaigns, except: [:edit, :update, :destroy]
end