//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ProfileScreen : View {
    let id : String?
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var router : Router
    @State private var selection = 0
    @State private var post = ""
    @State private var isPostFocused = false

    init(id : String?) {
        self.id = id
    }

    func getId() -> String? {
        if self.id != nil {
            return self.id
        }
        return context.ssbKey?.id
    }

    func isLoggedUser() -> Bool {
        return self.getId() == context.ssbKey?.id
    }

    func composer(_ profile: FullProfile) -> some View {
        VStack {
            MultilineTextField(
                self.isLoggedUser() ?
                    "Post something on your wall..." :
                    "Write something to " + (profile.profile.name ?? "unknown"),
                text: $post,
                isResponder: $isPostFocused
            )
                .padding(5)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Styles.gray, lineWidth: 1)
                )
            if self.isPostFocused {
                HStack {
                    Text("\(140 - self.post.count)")
                        .font(.title)
                        .bold()
                        .foregroundColor(Styles.gray)
                    Spacer()
                    PrimaryButton(text: "Publish", action: {
                        if (self.post.count > 140) {
                            return
                        }
                        if let id = self.getId() {
                            self.profiles.publish(context: self.context, id: id, message: self.post)
                            self.post = ""
                        }
                    })
                }
            }
        }
        .padding(.horizontal, 10)
    }

    func actionButtons(_ profile: FullProfile) -> some View {
        Group {
            if profile.friendshipStatus == "request_received" {
                Text((profile.profile.name ?? "unknown") + " sent you a friendship request")
                    .font(.subheadline)
            } else if profile.friendshipStatus == "request_rejected" {
                Text("You rejected " + (profile.profile.name ?? "unknown") + " friendship request")
                    .font(.subheadline)
            }

            HStack {
                if profile.friendshipStatus == "no_relation" {
                    PrimaryButton(text: "Add as friend") {
                        self.profiles.addFriend(context: self.context, id: profile.profile.id)
                    }
                } else if profile.friendshipStatus == "friends" {
                    PrimaryButton(text: "Undo Friendship", color: Styles.gray) {
                        self.profiles.rejectFriend(context: self.context, id: profile.profile.id)
                    }
                } else if profile.friendshipStatus == "request_sent" {
                    PrimaryButton(text: "Request sent  ✕", color: Styles.gray) {
                        self.profiles.rejectFriend(context: self.context, id: profile.profile.id)
                    }
                } else if profile.friendshipStatus == "request_received" {
                    PrimaryButton(text: "Accept") {
                        self.profiles.addFriend(context: self.context, id: profile.profile.id)
                    }
                    PrimaryButton(text: "Reject", color: Styles.gray) {
                        self.profiles.rejectFriend(context: self.context, id: profile.profile.id)
                    }
                } else if profile.friendshipStatus == "request_rejected" {
                    PrimaryButton(text: "Add as friend") {
                        self.profiles.addFriend(context: self.context, id: profile.profile.id)
                    }
                }
            }
        }
        .padding(.top, 10)
    }

    func profileView(_ profile: FullProfile) -> some View {
        ScrollView(.vertical) {
            // From: https://jetrockets.pro/blog/stretchy-header-in-swiftui
            GeometryReader { (geometry: GeometryProxy) in
                if geometry.frame(in: .global).minY <= 0 {
                    AsyncImage(url: Utils.avatarUrl(profile: profile.profile), imageLoader: self.imageLoader)
                        .aspectRatio(contentMode: .fill)
                        .offset(y: 50)
                        .frame(width: geometry.size.width,
                                height: geometry.size.height)
                } else {
                    AsyncImage(url: Utils.avatarUrl(profile: profile.profile), imageLoader: self.imageLoader)
                        .aspectRatio(contentMode: .fill)
                        .offset(y: -geometry.frame(in: .global).minY + 50)
                        .frame(width: geometry.size.width,
                                height: geometry.size.height +
                                        geometry.frame(in: .global).minY)
                }
            }.frame(minHeight: 150, maxHeight: 150)

            VStack(alignment: .leading) {
                VStack(alignment: .leading) {
                    Text(profile.profile.name ?? "unknown")
                        .font(.largeTitle)
                        .bold()

                    Text(
                        profile.description?.prefix(140).replacingOccurrences(of: "\n", with: "", options: .regularExpression) ?? ""
                    )

                    if !self.isLoggedUser() {
                        actionButtons(profile)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)

                self.composer(profile)
                Divider()
                PostsList(profile.posts)
            }
            .frame(maxWidth: .infinity)
            .background(Color.white)
        }
    }

    func profileResult() -> some View {
        if let id = self.getId(), let profile = profiles.profiles[id] {
            switch profile {
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading...")
                    .navigationBarTitle("Profile", displayMode: .inline))
            case let .success(profile):
                return AnyView(profileView(profile)
                    .navigationBarTitle(Text(profile.profile.name ?? "Profile"), displayMode: .inline)
                )
            case let .error(message):
                return AnyView(Text(message)
                    .navigationBarTitle("Profile", displayMode: .inline))
            }
        } else {
            return AnyView(Text("Loading...")
                .navigationBarTitle("Profile", displayMode: .inline))
        }
    }

    var body: some View {
        profileResult()
            .onAppear() {
                if let id = self.id {
                    self.profiles.load(context: self.context, id: id)
                }
                self.router.updateNavigationBarColor(route: .profile)
            }
    }
}

struct Profile_Previews: PreviewProvider {

    static var previews: some View {
        let relations = ["no_relation", "request_received", "friends", "request_sent", "request_rejected"]
        let profilesSamples : [(String, Profiles)] = relations.map { friedshipStatus in
            let profiles = Samples.profiles()
            var profile = Samples.fullProfile()
            profile.friendshipStatus = friedshipStatus
            profiles.profiles[profile.profile.id] = .success(profile)

            return (friedshipStatus, profiles)
        }

        return Group {
            ForEach(profilesSamples, id: \.0) { profiles in
                ProfileScreen(id: nil)
                    .environmentObject(Samples.context())
                    .environmentObject(profiles.1)
                    .environmentObject(ImageLoader())
                    .environmentObject(Router())
            }
        }
    }
}
