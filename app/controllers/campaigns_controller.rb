class CampaignsController < ApplicationController
    before_action :authenticate_admin!, except: [:index, :new, :create, :show, :show_publisher, :show_subscriber, :generate_subscriber_token]
    before_action :authenticate_user!, only: [:show_subscriber, :generate_subscriber_token]
    before_action :get_campaign, except: [:index, :new, :create]

    def index
        @campaigns = Campaign::all.order(created_at: "DESC")
    end

    def new
        @campaign = Campaign.new
    end

    def create
        @campaign = Campaign.new(campaign_params)
        if @campaign.valid?
            @campaign.save
            redirect_to root_path
        else
            render :new
        end
    end

    def show
    end

    def show_moderator
        @opentokInfo = VonageService.generate_access_token(
            { role: :moderator, data: "moderator" },
            @campaign.sub_session_id
        )
    end

    def show_publisher
        @opentokInfo = VonageService.generate_access_token(
            { role: :subscriber, data: "beforeAuth" },
            @campaign.sub_session_id
        )
    end

    def show_subscriber
        @opentokInfo = VonageService.generate_access_token(
            { role: :subscriber, data: "subscriber" },
            @campaign.sub_session_id
        )
    end

    # API
    def generate_moderator_token
        opentokInfo = VonageService.generate_access_token(
            { role: :moderator, data: params[:data], expire_time: Time.now + 10 },
            @campaign.session_id
        )
        render json: opentokInfo[:token]
    end
    def generate_publisher_token
        opentokInfo = VonageService.generate_access_token(
            { role: :publisher, data: params[:data], expire_time: Time.now + 10 },
            @campaign.session_id
        )
        render json: opentokInfo[:token]
    end
    def generate_subscriber_token
        if @campaign.status === 1
            opentokInfo = VonageService.generate_access_token(
                { role: :subscriber, data: params[:data], expire_time: Time.now + 10 },
                @campaign.session_id
            )
            render json: opentokInfo[:token]
        else
            render json: ''
        end
    end
    def start_broadcast
        @campaign.status = 1
        @campaign.save
        render json: true
    end
    def stop_broadcast
        @campaign.status = 0
        @campaign.save
        render json: false
    end
    def start_recording
        VonageService.start_recording(@campaign.session_id, params[:layout])
        @campaign.is_recorded = true
        @campaign.save
        render json: @campaign.is_recorded
    end
    def stop_recording
        VonageService.stop_recording(@campaign.session_id)
        @campaign.is_recorded = false
        @campaign.save
        render json: @campaign.is_recorded
    end
    def change_archive_layout
        VonageService.change_stream_layout_class(@campaign.session_id, params[:layoutClass])
        VonageService.change_archive_layout(@campaign.session_id, params[:layout])
        render json: nil
    end


    private

    def campaign_params
        params.require(:campaign).permit(:title).merge(session_id: VonageService.generate_session.session_id, sub_session_id: VonageService.generate_session.session_id)
    end

    def get_campaign
        @campaign = Campaign::find(params[:id])
    end
end
