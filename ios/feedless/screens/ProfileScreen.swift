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
    @State private var selectedTab : Int

    init(id : String?, selectedTab : Int = 0) {
        self.id = id
        _selectedTab = State(initialValue: selectedTab)
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

    func avatar(_ profile: FullProfile) -> some View {
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
    }

    func header(_ profile: FullProfile) -> some View {
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
    }

    let tabs = ["Wall", "Friends", "Communities"]
    func profileView(_ profile: FullProfile) -> some View {
        ScrollView(.vertical) {
            self.avatar(profile)

            VStack(alignment: .leading) {
                self.header(profile)

                if !self.isLoggedUser() {
                    Divider()

                    HStack {
                        Spacer()
                        Picker(selection: self.$selectedTab, label: Text("")) {
                            ForEach(0 ..< self.tabs.count) {
                                Text(self.tabs[$0])
                            }
                        }
                            .pickerStyle(SegmentedPickerStyle())
                            .frame(width: 300)
                        Spacer()
                    }
                }

                if self.selectedTab == 0 {
                    self.composer(profile)
                    Divider()
                    if profile.posts.count > 0 {
                        PostsList(profile.posts, reference: .WallId(profile.profile.id))
                    } else {
                        HStack {
                            Spacer()
                            if isLoggedUser() {
                                Text("✍️ You have no posts yet, share something!")
                            } else {
                                Text("No posts yet")
                            }
                            Spacer()
                        }
                        .padding(.top, 20)
                    }
                } else if self.selectedTab == 1 {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(profile.friends.friends, id: \.id) { friend in
                            Group {
                                NavigationLink(destination: ProfileScreen(id: friend.id)) {
                                    HStack {
                                        AsyncImage(url: Utils.avatarUrl(profile: friend), imageLoader: self.imageLoader)
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 32, height: 32)
                                            .border(Styles.darkGray)
                                        Text(friend.name ?? "unknown")
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .foregroundColor(Styles.gray)
                                    }
                                }
                                    .foregroundColor(Color.primary)
                                    .padding(.horizontal, 20)

                                if friend.id != profile.friends.friends.last?.id {
                                    Divider()
                                        .padding(.vertical, 10)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 10)
                } else if self.selectedTab == 2 {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(profile.communities, id: \.self) { community in
                            Group {
                                NavigationLink(destination: CommunitiesShow(name: community)) {
                                    Text("#\(community)")
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(Styles.gray)
                                }
                                    .foregroundColor(Color.primary)
                                    .padding(.horizontal, 20)

                                if community != profile.communities.last {
                                    Divider()
                                        .padding(.vertical, 10)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 10)
                }
            }
            .frame(maxWidth: .infinity)
            .background(Color(Styles.uiWhite))
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
        let selectedTab = [
            "no_relation": 0,
            "request_received": 1,
            "friends": 2
        ]

        let profilesSamples : [(String, Int, Profiles)] = relations.map { friedshipStatus in
            let profiles = Samples.profiles()
            var profile = Samples.fullProfile()
            profile.profile.id = "foo"
            profile.friendshipStatus = friedshipStatus
            profiles.profiles[profile.profile.id] = .success(profile)

            return (friedshipStatus, selectedTab[friedshipStatus] ?? 0, profiles)
        }

        return Group {
            ForEach(profilesSamples, id: \.0) { profiles in
                ProfileScreen(id: "foo", selectedTab: profiles.1)
                    .environmentObject(Samples.context())
                    .environmentObject(profiles.2)
                    .environmentObject(ImageLoader())
                    .environmentObject(Router())
            }
        }
    }
}
